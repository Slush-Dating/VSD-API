import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller('.well-known')
export class WellKnownController {
  @Get('apple-app-site-association')
  getAppleAppSiteAssociation(@Res() res: Response) {
    console.log(" teste  =====", join(__dirname, '../../', 'public', 'apple-app-site-association'));
    return res.sendFile(join(__dirname, '../../', 'public', 'apple-app-site-association'));
}

@Get('assetlinks.json')
getAssetLinks(@Res() res: Response) {
    console.log(" teste 222 =====", join(__dirname, '../../', 'public', 'assetlinks.json'));
    return res.sendFile(join(__dirname, '../../', 'public', 'assetlinks.json'));
  }
}