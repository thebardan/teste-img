import { Controller, Get, Post, Param, Query, NotFoundException, Sse, MessageEvent } from '@nestjs/common'
import { Observable } from 'rxjs'
import { NotificationsService } from './notifications.service'
import { UsersService } from '../users/users.service'
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator'
import { Public } from '../auth/public.decorator'

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly users: UsersService,
  ) {}

  @Get()
  async list(
    @CurrentUser() caller: RequestUser | null,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const user = await this.users.resolveCaller(caller?.email)
    const items = await this.service.listForUser(user.id, {
      unreadOnly: unreadOnly === 'true',
    })
    return { items }
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() caller: RequestUser | null) {
    const user = await this.users.resolveCaller(caller?.email)
    const count = await this.service.countUnread(user.id)
    return { count }
  }

  @Post(':id/read')
  async markRead(@CurrentUser() caller: RequestUser | null, @Param('id') id: string) {
    const user = await this.users.resolveCaller(caller?.email)
    const result = await this.service.markRead(user.id, id)
    if (result.count === 0) throw new NotFoundException('Notification not found')
    return { updated: true }
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() caller: RequestUser | null) {
    const user = await this.users.resolveCaller(caller?.email)
    const result = await this.service.markAllRead(user.id)
    return { updated: result.count }
  }

  @Public()
  @Sse('stream')
  async stream(@Query('email') email: string): Promise<Observable<MessageEvent>> {
    const user = await this.users.resolveCaller(email)
    return new Observable<MessageEvent>((subscriber) => {
      const unsubscribe = this.service.subscribe(user.id, (notif) => {
        subscriber.next({ data: notif })
      })
      const hb = setInterval(() => subscriber.next({ data: { ping: Date.now() } }), 30_000)
      return () => {
        clearInterval(hb)
        unsubscribe()
      }
    })
  }
}
