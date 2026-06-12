import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class StaffJwtGuard extends AuthGuard('staff-jwt') {}
