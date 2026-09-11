import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from '../../common/auth.guard';
import * as fs from 'fs';
import * as path from 'path';

const CATALOGS = ['insurance', 'labs', 'radiology', 'nursing'] as const;

@Controller('catalogs')
export class CatalogsController {
  @Public()
  @Get(':type')
  getCatalog(@Param('type') type: string) {
    if (!CATALOGS.includes(type as any)) throw new NotFoundException('catalog_not_found');
    const file = path.join(__dirname, '../../constants/catalogs', `${type}.json`);
    const alt = path.join(process.cwd(), 'src/constants/catalogs', `${type}.json`);
    const p = fs.existsSync(file) ? file : alt;
    if (!fs.existsSync(p)) throw new NotFoundException('catalog_file_missing');
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
}
