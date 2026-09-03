import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Post, Body, Param, NotFoundException, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { SeoService } from './seo.service';
import { IndexNowService } from './indexnow.service';
import { Public } from '../../common/auth.guard';

/**
 * Public SEO endpoints — slug resolution, meta tag generation,
 * sitemap.xml + robots.txt for search engine discovery.
 */
@UseGuards(JwtAuthGuard)
@Controller('seo')
export class SeoController {
  constructor(
    private readonly svc: SeoService,
    private readonly indexNowSvc: IndexNowService,
  ) {}

  /** Resolve a slug to its entity. */
  @Public()
  @Get('resolve/:type/:slug')
  async resolve(@Param('type') type: string, @Param('slug') slug: string) {
    const entity = await this.svc.resolve(type, slug);
    if (!entity) throw new NotFoundException('Entity not found');
    return entity;
  }

  /** Get meta tags JSON. */
  @Public()
  @Get('meta/:type/:slug')
  async meta(@Param('type') type: string, @Param('slug') slug: string) {
    return this.svc.meta(type, slug);
  }

  /** Build a sluggable URL for an entity. */
  @Public()
  @Get('build/:type/:id')
  async build(@Param('type') type: string, @Param('id') id: string) {
    return this.svc.buildShareLink(type, id);
  }

  /**
   * Auto-generated sitemap.xml — Google/Bing crawl this to discover
   * every medicine, doctor, lab service, home-care service and facility.
   */
  @Public()
  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    const xml = await this.svc.sitemap();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h cache
    res.send(xml);
  }

  /**
   * llms.txt — structured overview for AI search engines (llmstxt.org),
   * generated from live catalogue data.
   */
  @Public()
  @Get('llms.txt')
  async llmsTxt(@Res() res: Response) {
    const txt = await this.svc.llmsTxt();
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(txt);
  }

  /**
   * robots.txt — references the sitemap so crawlers can discover everything.
   */
  @Public()
  @Get('robots.txt')
  async robots(@Res() res: Response) {
    const txt = await this.svc.robots();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
    res.send(txt);
  }

  /**
   * IndexNow key verification file: search engines request this to verify domain ownership.
   */
  @Public()
  @Get('indexnow-key.txt')
  async indexNowKey(@Res() res: Response) {
    const key = this.indexNowSvc.getKey();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(key);
  }

  /**
   * Trigger on-demand or batch IndexNow submission for updated URLs.
   */
  @Post('indexnow/submit')
  async submitIndexNow(@Body('urls') urls: string[]) {
    return this.indexNowSvc.submitUrls(urls);
  }

  /**
   * Audit recent IndexNow submissions.
   */
  @Get('indexnow/submissions')
  async getIndexNowSubmissions() {
    return this.indexNowSvc.getRecentSubmissions();
  }
}
