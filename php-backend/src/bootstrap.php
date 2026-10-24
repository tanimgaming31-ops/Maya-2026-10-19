<?php
declare(strict_types=1);

/**
 * Standalone opt-in encrypted file vault. No Gemini key, phone action or
 * existing Maya memory is read or changed by this PHP backend.
 * The web server document root MUST be php-backend/public.
 */
function maya_error(string $code, int $status = 400): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => false, 'error' => $code]);
    exit;
}
function maya_json(array $value, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(['ok' => true] + $value, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function maya_configured(): bool {
    return strlen((string)getenv('MAYA_BACKEND_TOKEN')) >= 32
        && preg_match('/^[a-f0-9]{64}$/i', (string)getenv('MAYA_DATA_KEY')) === 1
        && extension_loaded('openssl');
}
function maya_id(): string { return bin2hex(random_bytes(12)); }
function maya_now(): string { return gmdate('c'); }
function maya_default(): array {
    return ['version'=>1, 'memories'=>[], 'tasks'=>[], 'backups'=>[],
        'routines'=>[], 'events'=>[], 'documents'=>[], 'drafts'=>[],
        'native_suggestions'=>[], 'failures'=>[]];
}
function maya_vault(callable $work): mixed {
    if (!maya_configured()) maya_error('not_configured', 503);
    $dir = (string)(getenv('MAYA_DATA_DIR') ?: dirname(__DIR__).'/private-data');
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) maya_error('storage_unavailable', 503);
    $real = realpath($dir);
    $public = realpath(dirname(__DIR__).'/public');
    if ($real === false || $public === false || $real === $public || str_starts_with($real, $public.DIRECTORY_SEPARATOR)) maya_error('unsafe_storage_location', 503);
    $file = $real.'/maya-vault.enc';
    $fp = @fopen($file, 'c+b');
    if (!$fp || !flock($fp, LOCK_EX)) maya_error('storage_unavailable', 503);
    @chmod($file, 0600);
    try {
        rewind($fp);
        $raw = stream_get_contents($fp, 5000001);
        if ($raw === false || strlen($raw) > 5000000) throw new RuntimeException('vault_too_large');
        $key = hex2bin((string)getenv('MAYA_DATA_KEY'));
        if ($key === false) throw new RuntimeException('invalid_data_key');
        if ($raw === '') {
            $db = maya_default();
        } else {
            $env = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
            if (($env['v'] ?? null) !== 1) throw new RuntimeException('vault_version');
            $plain = openssl_decrypt(
                base64_decode($env['data'], true), 'aes-256-gcm', $key,
                base64_decode($env['iv'], true), OPENSSL_RAW_DATA,
                base64_decode($env['tag'], true)
            );
            if ($plain === false) throw new RuntimeException('vault_decrypt_failed');
            $db = json_decode($plain, true, 32, JSON_THROW_ON_ERROR);
        }
        $changed = false;
        $result = $work($db, $changed);
        if ($changed) {
            $iv = random_bytes(12);
            $tag = '';
            $plain = json_encode($db, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
            if (strlen($plain) > 4000000) throw new RuntimeException('vault_limit');
            $encrypted = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
            if ($encrypted === false) throw new RuntimeException('vault_encrypt_failed');
            $encoded = json_encode(['v'=>1,'iv'=>base64_encode($iv),'tag'=>base64_encode($tag),'data'=>base64_encode($encrypted)], JSON_THROW_ON_ERROR);
            rewind($fp);
            if (fwrite($fp, $encoded) !== strlen($encoded)) throw new RuntimeException('vault_write_failed');
            ftruncate($fp, strlen($encoded));
            fflush($fp);
        }
        return $result;
    } catch (Throwable $e) {
        error_log('Maya backend vault: '.$e->getMessage());
        maya_error('storage_or_validation_error', 503);
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}
function maya_body(): array {
    $raw = file_get_contents('php://input', false, null, 0, 262145);
    if ($raw === false || strlen($raw) > 262144) maya_error('body_too_large', 413);
    try { $v = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
    catch (Throwable $e) { maya_error('invalid_json'); }
    if (!is_array($v) || array_is_list($v)) maya_error('expected_json_object');
    return $v;
}
function maya_string(array $input, string $field, int $max=2000): string {
    $v=$input[$field] ?? null;
    if (!is_string($v) || trim($v)==='' || strlen($v)>$max) maya_error('invalid_'.$field);
    return trim($v);
}
function maya_search(array $items, string $query, string $field='text', int $limit=15): array {
    $q=function_exists('mb_strtolower') ? mb_strtolower(trim($query)) : strtolower(trim($query));
    if ($q==='') return [];
    $words=preg_split('/\s+/u', $q) ?: [$q];
    $ranked=[];
    foreach ($items as $item) {
        $value=(string)($item[$field] ?? '');
        $hay=function_exists('mb_strtolower') ? mb_strtolower($value) : strtolower($value);
        $score=str_contains($hay,$q) ? 10 : 0;
        foreach ($words as $w) if ($w!=='' && str_contains($hay,$w)) $score++;
        if ($score>0) { $item['_score']=$score; $ranked[]=$item; }
    }
    usort($ranked, static fn($a,$b)=>($b['_score']<=>$a['_score']));
    return array_slice(array_map(static function($x){unset($x['_score']);return $x;},$ranked),0,$limit);
}
function maya_tick(): array {
    $count=0;
    $events=maya_vault(static function (&$db, &$changed) use (&$count) {
        $created=[];
        $now=time();
        foreach ($db['routines'] as &$r) {
            if (($r['enabled'] ?? false) && !($r['delivered'] ?? false) && strtotime($r['due_at']) <= $now) {
                $r['delivered']=true; // queued ONCE, not delivered to Android
                $item=['id'=>maya_id(),'routine_id'=>$r['id'],'message'=>$r['message'],'state'=>'queued_for_device','created_at'=>maya_now()];
                $db['events'][]=$item;
                $created[]=$item;
                $changed=true; $count++;
            }
        }
        unset($r);
        $db['events']=array_slice($db['events'],-200);
        return $created;
    });
    return ['queued_count'=>$count,'queued_events'=>$events];
}
