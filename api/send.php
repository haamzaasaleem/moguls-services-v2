<?php
// Receives every form on the site and emails it to the business inbox.
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    mm_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

// Bots fill the hidden "website" field; pretend it worked.
if (!empty($_POST['website'])) {
    mm_json(['ok' => true]);
}

$forms = [
    'quote' => [
        'subject' => 'New quote request',
        'fields' => [
            'name' => 'Name', 'email' => 'Email', 'phone' => 'Phone', 'company' => 'Company',
            'marketplaces' => 'Marketplaces', 'monthly_units' => 'Monthly units',
            'daily_orders' => 'Daily orders', 'services' => 'Services needed', 'message' => 'Message',
        ],
    ],
    'bundle' => [
        'subject' => 'New variety pack request',
        'fields' => [
            'name' => 'Name', 'email' => 'Email', 'category' => 'Product category',
            'items_per_pack' => 'Items per pack', 'different_products' => 'Different products per pack',
            'bundles_per_month' => 'Bundles per month', 'destination' => 'Destination', 'message' => 'Notes',
        ],
    ],
    'calculator' => [
        'subject' => 'Exact quote request from the calculator',
        'fields' => [
            'name' => 'Name', 'email' => 'Email', 'weight' => 'Weight', 'size' => 'Size',
            'items_per_pack' => 'Items per pack', 'daily_orders' => 'Daily orders',
            'monthly_units' => 'Monthly units', 'estimate' => 'Estimate shown',
        ],
    ],
];

$type = $_POST['form_type'] ?? '';
if (!isset($forms[$type])) {
    mm_json(['ok' => false, 'error' => 'Unknown form.'], 400);
}

function mm_clean($v)
{
    if (is_array($v)) {
        $v = implode(', ', array_map('mm_clean', $v));
    }
    $v = trim(strip_tags((string) $v));
    return mb_substr($v, 0, 3000);
}

$email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
if (!$email) {
    mm_json(['ok' => false, 'error' => 'Please enter a valid email address.'], 422);
}
if ($type === 'quote' && mm_clean($_POST['name'] ?? '') === '') {
    mm_json(['ok' => false, 'error' => 'Please enter your name.'], 422);
}

$lines = [];
foreach ($forms[$type]['fields'] as $key => $label) {
    $val = mm_clean($_POST[$key] ?? '');
    $lines[] = $label . ': ' . ($val === '' ? '(not given)' : $val);
}
$lines[] = '';
$lines[] = 'Sent ' . date('M j, Y g:i A') . ' from ' . ($_SERVER['HTTP_REFERER'] ?? 'the website');

// Recipient: admin setting first, config fallback.
$to = MM_TO_EMAIL;
$settingsFile = MM_DATA_DIR . '/settings.json';
if (is_readable($settingsFile)) {
    $s = json_decode(file_get_contents($settingsFile), true);
    if (!empty($s['quoteRecipient']) && filter_var($s['quoteRecipient'], FILTER_VALIDATE_EMAIL)) {
        $to = $s['quoteRecipient'];
    }
}

$name = preg_replace('/[\r\n]+/', ' ', mm_clean($_POST['name'] ?? ''));
$subject = $forms[$type]['subject'] . ($name !== '' ? ' from ' . $name : '');
$headers = [
    'From: Marketplace Moguls Website <' . MM_FROM_EMAIL . '>',
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
];

$sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', implode("\n", $lines), implode("\r\n", $headers));

if (!$sent) {
    mm_json(['ok' => false, 'error' => 'Our mail server did not accept the message. Please email us directly.'], 500);
}
mm_json(['ok' => true]);
