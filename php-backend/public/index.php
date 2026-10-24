<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/src/bootstrap.php';

// Standalone API. Deploy with this public/ folder as the ONLY document root.
// Never expose src/, private-data/, .env, repository or Memory Pack files.
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
$origin=$_SERVER['HTTP_ORIGIN'] ?? '';
$allowed=(string)getenv('MAYA_ALLOWED_ORIGIN');
if ($origin!=='' && $allowed!=='' && hash_equals($allowed,$origin)) {
    header('Access-Control-Allow-Origin: '.$allowed);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? '')==='OPTIONS') {
    http_response_code(($origin!=='' && $origin===$allowed) ? 204 : 403);
    exit;
}
$path=parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method=$_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($path==='/v1/health' && $method==='GET') {
    maya_json(['service'=>'maya-php-intelligence','configured'=>maya_configured(),'note'=>'This does not indicate APK integration'], maya_configured()?200:503);
}
if (!maya_configured()) maya_error('not_configured',503);
$auth=$_SERVER['HTTP_AUTHORIZATION'] ?? '';
$want='Bearer '.getenv('MAYA_BACKEND_TOKEN');
if (!hash_equals($want,$auth)) maya_error('unauthorized',401);
if ($origin!=='' && ($allowed==='' || !hash_equals($allowed,$origin))) maya_error('origin_not_allowed',403);
if (!in_array($method,['GET','POST'],true)) maya_error('method_not_allowed',405);

if ($path==='/v1/memories' && $method==='POST') {
    $p=maya_body(); $text=maya_string($p,'text',4000);
    $r=maya_vault(static function (&$db,&$changed) use($text) {
        if (count($db['memories'])>=300) maya_error('memory_limit',409);
        $item=['id'=>maya_id(),'text'=>$text,'created_at'=>maya_now()];
        $db['memories'][]=$item; $changed=true; return $item;
    });
    maya_json(['memory'=>$r],201);
}
if ($path==='/v1/memories/search' && $method==='GET') {
    $q=substr((string)($_GET['q']??''),0,150);
    maya_json(['memories'=>maya_vault(static fn($db)=>maya_search($db['memories'],$q))]);
}
if ($path==='/v1/memories' && $method==='GET') {
    maya_json(['memories'=>maya_vault(static fn($db)=>array_slice($db['memories'],-300))]);
}

if ($path==='/v1/backups' && $method==='POST') {
    $p=maya_body();
    if (($p['consent'] ?? false)!==true || !isset($p['payload']) || !is_array($p['payload'])) maya_error('backup_requires_consent_and_payload');
    $backup=maya_vault(static function (&$db,&$changed) use($p) {
        $item=['id'=>maya_id(),'created_at'=>maya_now(),'payload'=>$p['payload']];
        $db['backups'][]=$item;
        $db['backups']=array_slice($db['backups'],-5);
        $changed=true;
        return ['id'=>$item['id'],'created_at'=>$item['created_at']];
    });
    maya_json(['backup'=>$backup,'warning'=>'Restore is download-only; local Maya is never overwritten'],201);
}
if ($path==='/v1/backups/latest' && $method==='GET') {
    $r=maya_vault(static fn($db)=>end($db['backups']) ?: null);
    if ($r===null) maya_error('backup_not_found',404);
    maya_json(['backup'=>$r,'restored_to_device'=>false]);
}

if ($path==='/v1/tasks' && $method==='POST') {
    $p=maya_body(); $goal=maya_string($p,'goal',600);
    $steps=$p['steps'] ?? null;
    if (!is_array($steps) || !array_is_list($steps) || count($steps)<1 || count($steps)>4) maya_error('invalid_steps');
    foreach($steps as $step) {
        if (!is_array($step) || !in_array($step['tool']??null,['searchWeb','wikiSummary'],true)
            || !isset($step['query']) || !is_string($step['query']) || trim($step['query'])==='' || strlen($step['query'])>300) maya_error('unsafe_or_invalid_step');
    }
    $r=maya_vault(static function (&$db,&$changed) use ($goal,$steps) {
        $item=['id'=>maya_id(),'goal'=>$goal,'steps'=>$steps,'state'=>'planned_not_executed','created_at'=>maya_now(),'reported_outcome'=>null];
        $db['tasks'][]=$item; $db['tasks']=array_slice($db['tasks'],-100);
        $changed=true; return $item;
    });
    maya_json(['task'=>$r,'executed'=>false],201);
}
if ($path==='/v1/tasks' && $method==='GET') {
    maya_json(['tasks'=>maya_vault(static fn($db)=>array_slice($db['tasks'],-50))]);
}
if ($path==='/v1/tasks/report' && $method==='POST') {
    $p=maya_body(); $id=maya_string($p,'id',40);
    $status=maya_string($p,'status',40);
    if (!in_array($status,['client_reported_success','client_reported_failure','cancelled'],true)) maya_error('invalid_status');
    $r=maya_vault(static function (&$db,&$changed) use($id,$status) {
        foreach($db['tasks'] as &$task) if ($task['id']===$id) {
            $task['reported_outcome']=$status; $task['reported_at']=maya_now();
            $changed=true; return $task;
        }
        maya_error('task_not_found',404);
    });
    maya_json(['task'=>$r,'verified_execution'=>false]);
}

if ($path==='/v1/documents' && $method==='POST') {
    $p=maya_body();
    if (($p['consent']??false)!==true) maya_error('document_requires_consent');
    $title=maya_string($p,'title',160);
    // Extract text on phone first. No PDF binary ingestion in this stage.
    $text=maya_string($p,'text',30000);
    $r=maya_vault(static function (&$db,&$changed) use($title,$text) {
        if (count($db['documents'])>=40) maya_error('document_limit',409);
        $entry=['id'=>maya_id(),'title'=>$title,'text'=>$text,'created_at'=>maya_now()];
        $db['documents'][]=$entry; $changed=true;
        return ['id'=>$entry['id'],'title'=>$entry['title']];
    });
    maya_json(['document'=>$r,'pdf_parsed'=>false],201);
}
if ($path==='/v1/documents/search' && $method==='GET') {
    $q=substr((string)($_GET['q']??''),0,150);
    $hits=maya_vault(static fn($db)=>maya_search($db['documents'],$q,'text',10));
    $hits=array_map(static fn($x)=>['id'=>$x['id'],'title'=>$x['title'],'snippet'=>substr($x['text'],0,700)],$hits);
    maya_json(['documents'=>$hits]);
}

if ($path==='/v1/routines' && $method==='POST') {
    $p=maya_body(); $message=maya_string($p,'message',500); $date=maya_string($p,'due_at',40);
    try { $due=new DateTimeImmutable($date); } catch(Throwable $e) { maya_error('invalid_due_at'); }
    if (!preg_match('/(?:Z|[+-]\d\d:\d\d)$/',$date) || $due->getTimestamp()<=time()-30 || $due->getTimestamp()>time()+366*86400) maya_error('due_at_requires_future_timezone');
    $r=maya_vault(static function (&$db,&$changed) use($message,$due) {
        $entry=['id'=>maya_id(),'message'=>$message,'due_at'=>$due->format(DateTimeInterface::ATOM),'enabled'=>true,'delivered'=>false];
        $db['routines'][]=$entry; $db['routines']=array_slice($db['routines'],-100);
        $changed=true; return $entry;
    });
    maya_json(['routine'=>$r,'scheduled_on_android'=>false],201);
}
if ($path==='/v1/routines' && $method==='GET') maya_json(['routines'=>maya_vault(static fn($db)=>$db['routines'])]);
if ($path==='/v1/events' && $method==='GET') {
    maya_json(['events'=>maya_vault(static fn($db)=>array_values(array_filter($db['events'],static fn($e)=>($e['state']??'')==='queued_for_device')))]);
}
if ($path==='/v1/events/ack' && $method==='POST') {
    $p=maya_body(); $id=maya_string($p,'id',40);
    $r=maya_vault(static function (&$db,&$changed) use($id) {
        foreach($db['events'] as &$e) if ($e['id']===$id) {
            $e['state']='acknowledged_by_client'; $changed=true; return $e;
        }
        maya_error('event_not_found',404);
    });
    maya_json(['event'=>$r,'notification_delivered'=>false]);
}

if ($path==='/v1/messages/drafts' && $method==='POST') {
    $p=maya_body();
    if (($p['consent']??false)!==true) maya_error('explicit_consent_required');
    $incoming=maya_string($p,'incoming',3000); $draft=maya_string($p,'draft',3000);
    $r=maya_vault(static function (&$db,&$changed) use($incoming,$draft) {
        $entry=['id'=>maya_id(),'incoming'=>$incoming,'draft'=>$draft,'created_at'=>maya_now(),'sent'=>false];
        $db['drafts'][]=$entry; $db['drafts']=array_slice($db['drafts'],-50); $changed=true;
        return ['id'=>$entry['id'],'draft'=>$entry['draft'],'sent'=>false];
    });
    maya_json(['draft'=>$r,'automatic_reply'=>false],201);
}
if ($path==='/v1/native/suggestions' && $method==='POST') {
    $p=maya_body(); $type=maya_string($p,'type',40);
    if (!in_array($type,['OPEN_APP','READ_NOTIFICATION','SET_ALARM','FLASHLIGHT_ON','FLASHLIGHT_OFF'],true)) maya_error('unsupported_native_action');
    $detail=maya_string($p,'detail',500);
    $r=maya_vault(static function (&$db,&$changed) use($type,$detail) {
        $entry=['id'=>maya_id(),'type'=>$type,'detail'=>$detail,'state'=>'pending_android_user_confirmation','created_at'=>maya_now()];
        $db['native_suggestions'][]=$entry; $db['native_suggestions']=array_slice($db['native_suggestions'],-50); $changed=true; return $entry;
    });
    maya_json(['suggestion'=>$r,'device_action_executed'=>false],201);
}
if ($path==='/v1/native/suggestions' && $method==='GET') maya_json(['suggestions'=>maya_vault(static fn($db)=>$db['native_suggestions'])]);

if ($path==='/v1/failures' && $method==='POST') {
    $p=maya_body(); $source=maya_string($p,'source',80); $code=maya_string($p,'code',120);
    $retryable=($p['retryable']??false)===true;
    $r=maya_vault(static function (&$db,&$changed) use($source,$code,$retryable) {
        $e=['id'=>maya_id(),'source'=>$source,'code'=>$code,'retryable'=>$retryable,'created_at'=>maya_now()];
        $db['failures'][]=$e; $db['failures']=array_slice($db['failures'],-100); $changed=true; return $e;
    });
    maya_json(['failure'=>$r,'retry_policy'=>['max_attempts'=>3,'backoff_seconds'=>[1,3,9]],'automatic_retry_executed'=>false],201);
}
if ($path==='/v1/diagnostics' && $method==='GET') {
    $r=maya_vault(static fn($db)=>[
        'memories'=>count($db['memories']),'tasks'=>count($db['tasks']),
        'backups'=>count($db['backups']),'documents'=>count($db['documents']),
        'routines'=>count($db['routines']),'queued_events'=>count(array_filter($db['events'],static fn($e)=>$e['state']==='queued_for_device')),
        'failures'=>array_slice($db['failures'],-15)
    ]);
    maya_json(['diagnostics'=>$r,'android_apk_tested'=>false]);
}
maya_error('route_not_found',404);
