<?php
// Admin endpoint: checks the password and saves prices and settings.
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    mm_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    mm_json(['ok' => false, 'error' => 'Bad request'], 400);
}

if (MM_ADMIN_PASSWORD === '') {
    mm_json(['ok' => false, 'error' => 'Admin password is not set. Create api/config.local.php first (see README).'], 403);
}
if (!is_string($body['password'] ?? null) || !hash_equals(MM_ADMIN_PASSWORD, $body['password'])) {
    sleep(1);
    mm_json(['ok' => false, 'error' => 'Wrong password.'], 401);
}

if (($body['action'] ?? '') === 'verify') {
    mm_json(['ok' => true]);
}
if (($body['action'] ?? '') !== 'save') {
    mm_json(['ok' => false, 'error' => 'Unknown action'], 400);
}

function mm_num($v)
{
    if ($v === null || $v === '') return null;
    if (!is_numeric($v)) return null;
    return round((float) $v, 4);
}
function mm_str($v, $max = 300)
{
    return mb_substr(trim(strip_tags((string) ($v ?? ''))), 0, $max);
}

$p = $body['prices'] ?? null;
$s = $body['settings'] ?? null;
if (!is_array($p) || !is_array($s)) {
    mm_json(['ok' => false, 'error' => 'Missing data'], 400);
}

$prices = [
    'fnsku' => [
        'perItem' => mm_num($p['fnsku']['perItem'] ?? null),
        'twoPackAdd' => mm_num($p['fnsku']['twoPackAdd'] ?? null),
    ],
    'fulfillmentTiers' => [],
    'bundleBase' => [
        'perPack' => mm_num($p['bundleBase']['perPack'] ?? null),
        'note' => mm_str($p['bundleBase']['note'] ?? ''),
    ],
    'bundleTiers' => [],
    'wfsPrep' => [
        'perItem' => mm_num($p['wfsPrep']['perItem'] ?? null),
        'unit' => mm_str($p['wfsPrep']['unit'] ?? 'per item', 60),
        'note' => mm_str($p['wfsPrep']['note'] ?? ''),
    ],
    'palletStorage' => [
        'perPalletMonth' => mm_num($p['palletStorage']['perPalletMonth'] ?? null),
        'unit' => mm_str($p['palletStorage']['unit'] ?? 'per pallet per month', 60),
        'note' => mm_str($p['palletStorage']['note'] ?? ''),
    ],
    'extraServices' => [],
    'calculator' => [
        'palletUsableCubicInches' => mm_num($p['calculator']['palletUsableCubicInches'] ?? 96000) ?? 96000,
        'palletMaxWeightLb' => mm_num($p['calculator']['palletMaxWeightLb'] ?? 1500) ?? 1500,
        'oversizeWeightLb' => mm_num($p['calculator']['oversizeWeightLb'] ?? 50) ?? 50,
        'oversizeLongestSideIn' => mm_num($p['calculator']['oversizeLongestSideIn'] ?? 25) ?? 25,
    ],
];
foreach (array_slice((array) ($p['fulfillmentTiers'] ?? []), 0, 20) as $t) {
    $prices['fulfillmentTiers'][] = [
        'label' => mm_str($t['label'] ?? '', 80), 'min' => mm_num($t['min'] ?? 0) ?? 0, 'max' => mm_num($t['max'] ?? null),
        'firstItem' => mm_num($t['firstItem'] ?? null), 'extraItem' => mm_num($t['extraItem'] ?? null),
    ];
}
foreach (array_slice((array) ($p['bundleTiers'] ?? []), 0, 20) as $t) {
    $prices['bundleTiers'][] = [
        'label' => mm_str($t['label'] ?? '', 80), 'min' => mm_num($t['min'] ?? 0) ?? 0, 'max' => mm_num($t['max'] ?? null),
        'price' => mm_num($t['price'] ?? null),
    ];
}
foreach (array_slice((array) ($p['extraServices'] ?? []), 0, 40) as $t) {
    if (mm_str($t['name'] ?? '') === '') continue;
    $prices['extraServices'][] = [
        'name' => mm_str($t['name'], 120), 'price' => mm_num($t['price'] ?? null), 'unit' => mm_str($t['unit'] ?? '', 60),
    ];
}
if (!$prices['fulfillmentTiers'] || !$prices['bundleTiers']) {
    mm_json(['ok' => false, 'error' => 'Keep at least one order tier and one bundle tier.'], 422);
}

$settings = [];
foreach (['businessName', 'contactEmail', 'quoteRecipient', 'phone', 'address', 'hours'] as $k) {
    $settings[$k] = mm_str($s[$k] ?? '');
}
foreach (['contactEmail', 'quoteRecipient'] as $k) {
    if ($settings[$k] !== '' && !filter_var($settings[$k], FILTER_VALIDATE_EMAIL)) {
        mm_json(['ok' => false, 'error' => 'That email address does not look right: ' . $settings[$k]], 422);
    }
}

$flags = JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
$ok = file_put_contents(MM_DATA_DIR . '/prices.json', json_encode($prices, $flags) . "\n", LOCK_EX) !== false
   && file_put_contents(MM_DATA_DIR . '/settings.json', json_encode($settings, $flags) . "\n", LOCK_EX) !== false;

if (!$ok) {
    mm_json(['ok' => false, 'error' => 'Could not write to the data folder. Check its file permissions.'], 500);
}
mm_json(['ok' => true]);
