import { Controller, Post, Get, Param, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffJwtGuard } from '../staff-auth/staff-jwt.guard';
import { CsrfGuard } from '../common/csrf.guard';
import { Request } from 'express';

@UseGuards(CsrfGuard)
@Controller('mobile')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat/rooms')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRoom(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.chatService.createRoom(user.sub);
  }

  @Get('chat/rooms/my')
  @UseGuards(JwtAuthGuard)
  async getMyRoom(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.chatService.getMyRoom(user.sub);
  }

  @Get('chat/rooms/:id/messages')
  @UseGuards(JwtAuthGuard)
  async getMessages(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { sub: string };
    return this.chatService.getRoomMessages(id, user.sub);
  }

  @Post('chat/rooms/:id/messages')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('id') id: string,
    @Body('text') text: string,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: string };
    return this.chatService.sendUserMessage(id, user.sub, text);
  }

  @Post('chat/rooms/:id/typing')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async typing(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { sub: string };
    return this.chatService.typing(id, user.sub);
  }

  @Get('admin/chat/rooms')
  @UseGuards(StaffJwtGuard)
  async listRooms() {
    return this.chatService.listOpenRooms();
  }

  @Post('admin/chat/rooms/:id/assign')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async assignRoom(@Param('id') id: string, @Req() req: Request) {
    const staff = req.user as { sub: string };
    return this.chatService.assignRoom(id, staff.sub);
  }

  @Get('admin/chat/rooms/:id/messages')
  @UseGuards(StaffJwtGuard)
  async getAdminMessages(@Param('id') id: string, @Req() req: Request) {
    const staff = req.user as { sub: string };
    return this.chatService.getRoomMessages(id, undefined, staff.sub);
  }

  @Post('admin/chat/rooms/:id/messages')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendAdminMessage(
    @Param('id') id: string,
    @Body('text') text: string,
    @Req() req: Request,
  ) {
    const staff = req.user as { sub: string };
    return this.chatService.sendOperatorMessage(id, staff.sub, text);
  }

  @Post('admin/chat/rooms/:id/close')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async closeRoom(@Param('id') id: string) {
    return this.chatService.closeRoom(id);
  }

  @Post('admin/chat/rooms/:id/typing')
  @UseGuards(StaffJwtGuard)
  @HttpCode(HttpStatus.OK)
  async adminTyping(@Param('id') id: string, @Req() req: Request) {
    const staff = req.user as { sub: string };
    return this.chatService.typing(id, undefined, staff.sub);
  }
}
