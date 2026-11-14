"""The crawler's error-text pattern: an HTTP status is an error, a number on the screen is not.

Run: python3 -m unittest tools/native/test_error_text.py
"""
import importlib.util, os, unittest

spec = importlib.util.spec_from_file_location('native_crawl', os.path.join(os.path.dirname(__file__), 'native_crawl.py'))
nc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nc)


class ErrorText(unittest.TestCase):
    def test_numbers_on_screen_are_not_errors(self):
        for text in ['+500 ml', '500', 'Add 500 ml', 'SAR 500', '500 ر.س', 'Total: 1500', '4040 steps', '+٥٠٠ مل']:
            self.assertIsNone(nc.ERROR_TEXT.search(text), text)

    def test_http_statuses_are_errors(self):
        for text in ['Error 500', 'HTTP 500', 'status: 500', 'Request failed with status code 500', '500 Internal Server Error', '404 Not Found', 'Error: 404', 'code 404']:
            self.assertIsNotNone(nc.ERROR_TEXT.search(text), text)

    def test_the_other_messages_still_match(self):
        for text in ['Something went wrong', 'حدث خطأ', 'Network Error', 'الصفحة غير متاحة']:
            self.assertIsNotNone(nc.ERROR_TEXT.search(text), text)


if __name__ == '__main__':
    unittest.main()
