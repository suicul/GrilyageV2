import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: 'ok';
  uptime: number;
}

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
    };
  }
}
