import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../core/api/providers.dart';
import '../../core/api/client.dart';

final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  return ChatNotifier(ref.read(apiClientProvider));
});

class ChatState {
  final bool isLoading;
  final String? error;
  final ChatRoom? room;
  final List<ChatMessage> messages;
  final bool userIsTyping;
  final bool operatorIsTyping;

  const ChatState({
    this.isLoading = false,
    this.error,
    this.room,
    this.messages = const [],
    this.userIsTyping = false,
    this.operatorIsTyping = false,
  });

  ChatState copyWith({
    bool? isLoading,
    String? error,
    ChatRoom? room,
    List<ChatMessage>? messages,
    bool? userIsTyping,
    bool? operatorIsTyping,
    bool clearError = false,
  }) =>
      ChatState(
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
        room: room ?? this.room,
        messages: messages ?? this.messages,
        userIsTyping: userIsTyping ?? this.userIsTyping,
        operatorIsTyping: operatorIsTyping ?? this.operatorIsTyping,
      );
}

class ChatMessage {
  final String id;
  final String senderType;
  final String text;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.senderType,
    required this.text,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as String,
    senderType: json['senderType'] as String,
    text: json['text'] as String,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  bool get isFromUser => senderType == 'USER';
  bool get isFromOperator => senderType == 'OPERATOR';
}

class ChatRoom {
  final String id;
  final String status;
  final String? staffId;

  ChatRoom({required this.id, required this.status, this.staffId});

  factory ChatRoom.fromJson(Map<String, dynamic> json) => ChatRoom(
    id: json['id'] as String,
    status: json['status'] as String,
    staffId: json['staffId'] as String?,
  );
}

class ChatNotifier extends StateNotifier<ChatState> {
  final ApiClient _api;
  io.Socket? _socket;
  String? _roomId;

  ChatNotifier(this._api) : super(const ChatState());

  String get _baseUrl => 'https://grillyage.ru';

  Future<void> init() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final resp = await _api.post('/chat/rooms');
      final room = ChatRoom.fromJson(resp.data);
      _roomId = room.id;

      final msgResp = await _api.get('/chat/rooms/$_roomId/messages');
      final messages = (msgResp.data as List)
          .map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
          .toList();

      state = state.copyWith(
        isLoading: false,
        room: room,
        messages: messages,
      );

      _connectSocket();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Не удалось открыть чат');
    }
  }

  void _connectSocket() {
    _socket = io.io('$_baseUrl/chat', io.OptionBuilder()
      .setTransports(['websocket'])
      .setPath('/socket.io')
      .disableAutoConnect()
      .build());

    _socket!.onConnect((_) {
      _socket!.emit('chat.join', _roomId);
    });

    _socket!.on('chat.message', (data) {
      if (data is Map<String, dynamic>) {
        final msg = ChatMessage.fromJson(data);
        if (msg.senderType == 'OPERATOR') {
          state = state.copyWith(
            messages: [...state.messages, msg],
            operatorIsTyping: false,
          );
        }
      }
    });

    _socket!.on('chat.typing', (data) {
      if (data is Map<String, dynamic> && data['userId'] != null) {
        state = state.copyWith(operatorIsTyping: true);
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) state = state.copyWith(operatorIsTyping: false);
        });
      }
    });

    _socket!.on('chat.room.assigned', (data) {
      if (data is Map<String, dynamic>) {
        state = state.copyWith(
          room: ChatRoom(
            id: state.room!.id,
            status: 'ASSIGNED',
            staffId: data['staffId'] as String?,
          ),
        );
      }
    });

    _socket!.on('chat.room.closed', (_) {
      state = state.copyWith(
        room: ChatRoom(id: state.room!.id, status: 'CLOSED'),
      );
    });

    _socket!.connect();
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty || _roomId == null) return;

    final optimistic = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      senderType: 'USER',
      text: text.trim(),
      createdAt: DateTime.now(),
    );

    state = state.copyWith(messages: [...state.messages, optimistic]);

    try {
      final resp = await _api.post('/chat/rooms/$_roomId/messages', data: {
        'text': text.trim(),
      });
      final saved = ChatMessage.fromJson(resp.data);
      state = state.copyWith(
        messages: state.messages.map((m) => m.id == optimistic.id ? saved : m).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: 'Ошибка отправки');
    }
  }

  void onTyping() {
    if (_roomId != null && _socket != null && _socket!.connected) {
      _socket!.emit('chat.typing', _roomId);
    }
  }

  @override
  void dispose() {
    if (_socket != null) {
      if (_roomId != null) _socket!.emit('chat.leave', _roomId);
      _socket!.disconnect();
      _socket!.dispose();
    }
    super.dispose();
  }
}
