"""Exercise the PHP handler with an isolated local mail sink, never external email."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

HANDLER = Path(__file__).resolve().parents[1] / 'site/api/enquiry.php'

@unittest.skipUnless(shutil.which('php'), 'PHP CLI required')
class EnquiryRuntimeChecks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.sink = self.root / 'mail.txt'
        self.sendmail = self.root / 'sendmail'
        self.sendmail.write_text('#!/bin/sh\ncat >> "$SF_TEST_MAIL"\n')
        self.sendmail.chmod(0o700)

    def invoke(self, changes=None, server=None, failure=False):
        data = dict(name='Release QA', company='Staurus Foods isolated QA',
                    email='info@staurusfoods.com', destination='United Kingdom',
                    commodity='Dried hibiscus flowers', quantity='QA only, no order',
                    type='Product quotation', requirements='Transport test only',
                    privacy_confirmation='Accepted', submitted_at='1', website='')
        data.update(changes or {})
        request = dict(REQUEST_METHOD='POST', CONTENT_TYPE='application/x-www-form-urlencoded',
                       REMOTE_ADDR='127.0.0.1', HTTP_ORIGIN='https://staurusfoods.com')
        request.update(server or {})
        harness = self.root / 'invoke.php'
        # Decode JSON rather than interpolating any data as executable PHP.
        import base64
        encode = lambda obj: base64.b64encode(json.dumps(obj).encode()).decode()
        harness.write_text("<?php $_POST=json_decode(base64_decode('" + encode(data) +
            "'),true); $_SERVER=json_decode(base64_decode('" + encode(request) +
            "'),true); register_shutdown_function(function(){fwrite(STDERR,'STATUS:'.http_response_code());}); require " +
            repr(str(HANDLER)) + ";")
        result = subprocess.run(['php', '-d', 'display_errors=0', '-d',
            'sys_temp_dir=' + str(self.root), '-d',
            'sendmail_path=' + ('/bin/false' if failure else str(self.sendmail)), str(harness)],
            env={**os.environ, 'SF_TEST_MAIL': str(self.sink)}, capture_output=True, text=True, check=True)
        return int(result.stderr.split('STATUS:')[-1]), json.loads(result.stdout)

    def test_syntax(self):
        subprocess.run(['php', '-l', str(HANDLER)], check=True, capture_output=True)

    def test_correct_details_and_all_products(self):
        for product in ['Dried hibiscus flowers','Raw cashew nuts','Cocoa beans','Sesame seeds',
                        'Soya beans','Other dry agricultural commodity']:
            status, body = self.invoke({'commodity': product}, {'REMOTE_ADDR': product})
            self.assertEqual(status, 200)
            self.assertTrue(body['success'])
            text = self.sink.read_text()
            for value in ['Release QA','Staurus Foods isolated QA','info@staurusfoods.com',
                          'United Kingdom',product,'QA only, no order','Transport test only']:
                self.assertIn(value, text)

    def test_invalid_required_email_product_privacy(self):
        for change in [{'name':''}, {'email':'bad'}, {'commodity':'Invalid'}, {'privacy_confirmation':''}]:
            self.assertEqual(self.invoke(change)[0], 400)
        self.assertFalse(self.sink.exists())

    def test_method_origin_type_size(self):
        for request, expected in [
            ({'REQUEST_METHOD':'GET'},405), ({'HTTP_ORIGIN':'https://example.com'},403),
            ({'CONTENT_TYPE':'application/json'},415), ({'CONTENT_LENGTH':'12001'},413)]:
            self.assertEqual(self.invoke(server=request)[0], expected)
        self.assertFalse(self.sink.exists())

    def test_honeypot_never_sends(self):
        self.assertEqual(self.invoke({'website':'spam.example'})[0], 200)
        self.assertFalse(self.sink.exists())

    def test_too_fast_and_field_length(self):
        import time
        self.assertEqual(self.invoke({'submitted_at':str(int(time.time()))})[0],400)
        self.assertEqual(self.invoke({'requirements':'x'*6001})[0],400)
        self.assertFalse(self.sink.exists())

    def test_rate_limit(self):
        for _ in range(4):
            self.assertEqual(self.invoke()[0],200)
        self.assertEqual(self.invoke()[0],429)
        self.assertEqual(self.sink.read_text().count('New buyer enquiry received'),4)

    def test_mail_failure_is_error(self):
        status, body = self.invoke(failure=True)
        self.assertEqual(status,503)
        self.assertFalse(body['success'])
