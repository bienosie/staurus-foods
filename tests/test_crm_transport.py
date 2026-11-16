"""Exercise the real PHP adapter without network or real email. PHP -n disables curl,
so a deterministic curl fixture replaces only transport, not adapter behaviour."""
import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

@unittest.skipUnless(shutil.which('php'), 'PHP CLI required')
class CrmTransportChecks(unittest.TestCase):
    def invoke(self, *, enabled=True, crm_status=200, mail_failure=False, bad_url=False):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            mail = tmp / 'sendmail'
            mail.write_text('#!/bin/sh\ncat > "$SF_TEST_MAIL"\n')
            mail.chmod(0o700)
            values = dict(name='Synthetic contact', company='ISOLATED TEST ONLY',
                          email='fixture@example.invalid', destination='Test destination',
                          commodity='Sesame seeds', quantity='1 test unit', type='Quotation',
                          requirements='Synthetic data only', privacy_confirmation='Accepted',
                          website='', submitted_at='1',
                          request_id='00000000-0000-4000-8000-000000000001', utm_source='test')
            code = '''<?php
foreach(['CURLOPT_POST','CURLOPT_POSTFIELDS','CURLOPT_HTTPHEADER','CURLOPT_RETURNTRANSFER','CURLOPT_CONNECTTIMEOUT','CURLOPT_TIMEOUT','CURLOPT_FOLLOWLOCATION','CURLOPT_PROTOCOLS','CURLPROTO_HTTPS','CURLINFO_RESPONSE_CODE'] as $i=>$name) define($name,$i+1);
function curl_init($url) { return $url; }
function curl_setopt_array($ch,$options) { file_put_contents(getenv('SF_TEST_REQUEST'),$options[CURLOPT_POSTFIELDS]); return true; }
function curl_exec($ch) { return json_encode('00000000-0000-4000-8000-000000000099'); }
function curl_getinfo($ch,$key) { return (int)getenv('SF_TEST_STATUS'); }
function curl_close($ch) {}
$_POST=json_decode(base64_decode('PAYLOAD'),true);
$_SERVER=['REQUEST_METHOD'=>'POST','CONTENT_TYPE'=>'application/x-www-form-urlencoded','HTTP_ORIGIN'=>'https://staurusfoods.com','REMOTE_ADDR'=>'fixture'];
register_shutdown_function(function(){fwrite(STDERR,'STATUS:'.http_response_code());});
require HANDLER;
'''.replace('PAYLOAD', base64.b64encode(json.dumps(values).encode()).decode()).replace('HANDLER', repr(str(ROOT / 'site/api/enquiry.php')))
            harness = tmp / 'test.php'
            harness.write_text(code)
            result = subprocess.run(['php','-n','-d','display_errors=0','-d','sys_temp_dir='+str(tmp),
                                     '-d','sendmail_path='+('/bin/false' if mail_failure else str(mail)),str(harness)],
                env={**os.environ, 'SF_CRM_ENABLED':'true' if enabled else 'false',
                     'SF_CRM_URL':'https://attacker.invalid' if bad_url else 'https://fixture.supabase.co',
                     'SF_CRM_SECRET_KEY':'sb_secret_fixture_only', 'SF_TEST_STATUS':str(crm_status),
                     'SF_TEST_REQUEST':str(tmp/'request.json'),'SF_TEST_MAIL':str(tmp/'mail.txt')},
                capture_output=True,text=True,check=True)
            request = json.loads((tmp/'request.json').read_text()) if (tmp/'request.json').exists() else None
            sent = (tmp/'mail.txt').read_text() if (tmp/'mail.txt').exists() else ''
            self.assertNotIn('sb_secret_fixture_only',result.stdout + result.stderr)
            return int(result.stderr.split('STATUS:')[-1]), json.loads(result.stdout), request, sent

    def test_disabled_preserves_email_only(self):
        status, _, request, mail = self.invoke(enabled=False)
        self.assertEqual(status,200)
        self.assertIsNone(request)
        self.assertNotIn('CRM enquiry reference',mail)

    def test_capture_and_notification_reference(self):
        status, _, request, mail = self.invoke()
        self.assertEqual(status,200)
        self.assertEqual(request['p_request_id'],'00000000-0000-4000-8000-000000000001')
        self.assertEqual(request['p_payload']['utm'],{'utm_source':'test'})
        self.assertIn('CRM enquiry reference:',mail)

    def test_crm_failure_falls_back_to_email(self):
        self.assertEqual(self.invoke(crm_status=503)[0],200)

    def test_mail_failure_with_durable_crm_capture_is_accepted(self):
        status, body, _, _ = self.invoke(mail_failure=True)
        self.assertEqual(status,200)
        self.assertIn('recorded',body['message'])

    def test_both_transports_failing_is_not_success(self):
        status, body, _, _ = self.invoke(crm_status=503,mail_failure=True)
        self.assertEqual(status,503)
        self.assertFalse(body['success'])

    def test_untrusted_url_is_never_contacted(self):
        status, _, request, _ = self.invoke(bad_url=True)
        self.assertEqual(status,200)
        self.assertIsNone(request)
