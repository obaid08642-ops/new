import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatSession, ChatSessionDocument } from '../../../schemas/chat-session.schema';
import { User, UserDocument } from '../../../schemas/user.schema';
import { UserRole } from '../../../common/enums';

@Injectable()
export class ChatGatewayGuard implements CanActivate {
  constructor(
    @InjectModel(ChatSession.name) private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { chatSessionId, senderId, actionType } = request.body; // actionType: 'TEXT' | 'MEDIA_STREAM'

    const session = await this.chatSessionModel.findById(chatSessionId);
    if (!session) throw new ForbiddenException('Chat session record not registered.');

    // RULE: FAMILY CHAT bypasses all constraints permanently
    if (session.type === 'FAMILY') return true;

    // CLINICAL LIFECYCLE MANAGEMENT RULES
    if (session.status === 'WAITING_FOR_DOCTOR') {
      const sender = await this.userModel.findById(senderId);
      if (!sender || sender.role !== UserRole.DOCTOR) {
        throw new ForbiddenException('المريض في غرفة الانتظار الافتراضية. يجب على الطبيب فتح وبدء الاستشارة أولاً.');
      }
      // Automate transitioning to LIVE status upon doctor initiation actions
      session.status = 'LIVE';
      await session.save();
    }

    if (session.status === 'FOLLOW_UP') {
      if (actionType === 'MEDIA_STREAM') {
        throw new ForbiddenException('انتهت مدة الاستشارة الطبية الحية. قنوات الصوت والفيديو مغلقة، متاح الشات الكتابي فقط للمتابعة.');
      }
    }

    if (session.status === 'CLOSED') {
      throw new ForbiddenException('تم إغلاق الجلسة الطبية والمتابعة نهائياً. يمكنك فقط الاطلاع على سجل المحادثة كأرشيف طبي.');
    }

    return true;
  }
}
