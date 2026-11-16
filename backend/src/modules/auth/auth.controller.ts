import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { SignupDto } from './dto/signup.dto.js';


// @Controller('auth')

@Controller({
  path: 'auth',
  version: '1',
})

export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @Req() req: any,
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.logout(
      req.user.sub,
      dto.refreshToken,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub);
  }


  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }


  @Get('test')
  test(@Req() req: any) {
    return "fdgfsdgfdg";
  }
}