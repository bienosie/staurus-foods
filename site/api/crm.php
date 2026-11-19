<?php
declare(strict_types=1);
/** Optional Phase 2 adapter. Disabled unless explicitly commissioned server-side. */
function sf_crm_submit(array $values, array $post): ?string {
    if (getenv('SF_CRM_ENABLED') !== 'true') return null;
    $url = (string)getenv('SF_CRM_URL');
    $secret = (string)getenv('SF_CRM_SECRET_KEY');
    if (!preg_match('~^https://[a-z0-9-]+\.supabase\.co$~D', $url) || $secret === '' || !function_exists('curl_init')) {
        error_log('Staurus Foods CRM configuration unavailable; using inbox transport');
        return null;
    }
    $requestId = is_string($post['request_id'] ?? null) ? $post['request_id'] : '';
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iD', $requestId)) {
        // Non-JavaScript clients still work. Browser retries supply a stable UUID.
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        $requestId = substr($hex,0,8).'-'.substr($hex,8,4).'-'.substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20);
    }
    $utm = [];
    foreach (['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as $key) {
        if (is_string($post[$key] ?? null)) $utm[$key] = mbSafeTruncate($post[$key]);
    }
    $payload = $values;
    $payload['privacy_confirmation'] = 'Accepted';
    $payload['source'] = 'website';
    $payload['utm'] = (object)$utm;
    $body = json_encode(['p_request_id'=>$requestId, 'p_payload'=>$payload]);
    if ($body === false) return null;
    $ch = curl_init($url . '/rest/v1/rpc/sf_create_enquiry');
    $headers = ['Content-Type: application/json', 'apikey: ' . $secret];
    // Legacy service_role JWTs require Authorization; new secret API keys do not.
    if (!str_starts_with($secret, 'sb_secret_')) $headers[] = 'Authorization: Bearer ' . $secret;
    curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$body,
        CURLOPT_HTTPHEADER=>$headers, CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_CONNECTTIMEOUT=>2, CURLOPT_TIMEOUT=>5, CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $id = is_string($response) ? json_decode($response, true) : null;
    if ($status === 200 && is_string($id) && preg_match('/^[0-9a-f-]{36}$/D', $id)) return $id;
    // Never log payloads, credentials, response bodies or buyer email addresses.
    error_log('Staurus Foods CRM capture unavailable; using inbox transport');
    return null;
}
function mbSafeTruncate(string $value): string {
    $value = preg_replace('/[\x00-\x1F\x7F]+/u',' ', $value) ?? '';
    // Keep valid UTF-8 without requiring mbstring on shared hosting.
    preg_match('/^.{0,150}/us', $value, $match);
    return $match[0] ?? '';
}
