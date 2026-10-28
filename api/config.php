<?php
// Site settings for the PHP endpoints.
// Do not put your real admin password here. Create api/config.local.php
// (it is ignored by git) and define MM_ADMIN_PASSWORD there, for example:
//   <?php define('MM_ADMIN_PASSWORD', 'your long password');

if (file_exists(__DIR__ . '/config.local.php')) {
    require __DIR__ . '/config.local.php';
}

// Where form submissions go if data/settings.json has no valid quoteRecipient.
if (!defined('MM_TO_EMAIL')) define('MM_TO_EMAIL', 'haamzaasaleem@gmail.com');

// Sender address for outgoing mail. Use an address on your own domain.
if (!defined('MM_FROM_EMAIL')) define('MM_FROM_EMAIL', 'website@marketplacemogulsservices.com');

// Empty password means the admin page cannot save anything.
if (!defined('MM_ADMIN_PASSWORD')) define('MM_ADMIN_PASSWORD', '');

define('MM_DATA_DIR', dirname(__DIR__) . '/data');

function mm_json($data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data);
    exit;
}
