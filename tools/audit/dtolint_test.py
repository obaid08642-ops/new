#!/usr/bin/env python3
"""Self-test for dtolint.py: every decorator of a DTO property counts.

  python3 tools/audit/dtolint_test.py        (from repo root)
"""
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest

DTOLINT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dtolint.py')


def run(files):
    """Run dtolint on a throw-away backend/src tree; return (exit code, output)."""
    with tempfile.TemporaryDirectory() as root:
        for rel, body in files.items():
            path = os.path.join(root, 'backend', 'src', rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf8') as fh:
                fh.write(textwrap.dedent(body))
        proc = subprocess.run([sys.executable, DTOLINT], cwd=root, capture_output=True, text=True)
        return proc.returncode, proc.stdout + proc.stderr


class DtoLintReadsAllDecorators(unittest.TestCase):
    def test_multi_line_decorator_counts_without_a_dummy(self):
        code, out = run({'m/kind.dto.ts': '''
            import { IsIn, IsString } from 'class-validator';
            export class KindDto {
              @IsIn([
                'a', 'b',
                'c',
              ])
              kind: string;

              @IsString()
              locale: string;
            }
        '''})
        self.assertEqual(code, 0, out)
        self.assertIn('undecorated DTO props (always rejected): 0', out)

    def test_same_line_decorators_are_read_and_an_unvalidated_any_is_caught(self):
        code, out = run({'m/meta.dto.ts': '''
            export class MetaDto {
              @IsOptional() @IsString() @MaxLength(10) ok?: string;
              @IsOptional() meta?: any;
              @IsOptional() @Type(() => Object) other?: any;
            }
        '''})
        self.assertEqual(code, 1, out)
        self.assertIn('MetaDto.meta: any', out)
        self.assertIn('MetaDto.other: any', out)
        self.assertNotIn('MetaDto.ok', out)

    def test_undecorated_property_is_caught(self):
        code, out = run({'m/plain.dto.ts': '''
            export class PlainDto {
              @IsString() named: string;
              bare?: string;
            }
        '''})
        self.assertEqual(code, 1, out)
        self.assertIn('PlainDto.bare: string', out)
        self.assertNotIn('PlainDto.named', out)

    def test_body_dto_declared_in_a_controller_is_checked(self):
        code, out = run({'m/x.controller.ts': '''
            // this class rather than a type alias is what ValidationPipe needs
            export class InlineBodyDto {
              @IsOptional() payload?: any;
            }
            @Controller('x')
            export class XController {
              @Post() create(@Body() body: InlineBodyDto) { return body; }
            }
        '''})
        self.assertEqual(code, 1, out)
        self.assertIn('InlineBodyDto.payload: any', out)

    def test_methods_and_constructors_are_not_properties(self):
        code, out = run({'m/svc.dto.ts': '''
            export class WithMethodDto {
              @IsString() name: string;
              constructor(private readonly x: string) {}
              describe(): string { const local: number = 1; return String(local); }
            }
        '''})
        self.assertEqual(code, 0, out)


if __name__ == '__main__':
    unittest.main()
