<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require_once dirname(__DIR__).'/src/bootstrap.php';
// Run ONLY from a trusted PHP-capable host's cron/CLI. Not a background service.
if (!maya_configured()) { fwrite(STDERR,"Maya PHP backend environment not configured\n"); exit(2); }
$result=maya_tick();
echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)."\n";
