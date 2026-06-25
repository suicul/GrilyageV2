import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import '../../core/api/providers.dart';

/// States for the call lifecycle.
enum CallStatus { idle, queued, waiting, connecting, active, ended, error }

class CallState {
  final CallStatus status;
  final String? roomName;
  final String? token;
  final String? callId;
  final int? position;
  final String? error;
  final Room? room;

  const CallState({
    this.status = CallStatus.idle,
    this.roomName,
    this.token,
    this.callId,
    this.position,
    this.error,
    this.room,
  });

  CallState copyWith({
    CallStatus? status,
    String? roomName,
    String? token,
    String? callId,
    int? position,
    String? error,
    Room? room,
  }) {
    return CallState(
      status: status ?? this.status,
      roomName: roomName ?? this.roomName,
      token: token ?? this.token,
      callId: callId ?? this.callId,
      position: position ?? this.position,
      error: error ?? this.error,
      room: room ?? this.room,
    );
  }
}

class CallNotifier extends StateNotifier<CallState> {
  final Ref _ref;
  Room? _room;
  CancelListenFunc? _disconnectListener;
  bool _disposed = false;

  CallNotifier(this._ref) : super(const CallState());

  /// Enqueue the user in the call queue.
  Future<void> enqueue() async {
    if (state.status != CallStatus.idle) return;
    state = state.copyWith(status: CallStatus.queued);

    try {
      final api = _ref.read(apiClientProvider);
      final resp = await api.post('/calls/enqueue');
      final data = resp.data as Map<String, dynamic>;
      final call = data['call'] as Map<String, dynamic>;
      state = state.copyWith(
        status: CallStatus.waiting,
        callId: call['id'] as String?,
        roomName: data['roomName'] as String?,
        token: data['token'] as String?,
        position: call['position'] as int?,
      );
    } catch (e) {
      state = state.copyWith(
        status: CallStatus.error,
        error: 'Не удалось подключиться к оператору: $e',
      );
    }
  }

  /// Dequeue (cancel waiting).
  Future<void> dequeue() async {
    try {
      final api = _ref.read(apiClientProvider);
      await api.post('/calls/dequeue');
    } catch (_) {}
    await _disconnectRoom();
    state = const CallState();
  }

  /// Connect to the LiveKit room after receiving token.
  Future<void> connectToRoom() async {
    if (state.token == null || state.roomName == null) return;
    state = state.copyWith(status: CallStatus.connecting);

    try {
      const liveKitUrl = 'wss://grillyage.ru';

      final room = Room(
        roomOptions: const RoomOptions(
          defaultVideoPublishOptions: VideoPublishOptions(
            videoEncoding: VideoEncoding(
              maxBitrate: 800000,
              maxFramerate: 24,
            ),
          ),
        ),
      );
      _room = room;

      _disconnectListener = room.events.listen((event) {
        if (event is RoomDisconnectedEvent) {
          Future.microtask(() {
            if (!_disposed) {
              state = const CallState(status: CallStatus.ended);
            }
          });
        }
      });

      await room.connect(liveKitUrl, state.token!);

      // Mute local video — voice call only
      await room.localParticipant?.setCameraEnabled(false);
      await room.localParticipant?.setMicrophoneEnabled(true);

      state = state.copyWith(status: CallStatus.active, room: room);

      // Notify backend connected
      if (state.callId != null) {
        try {
          final api = _ref.read(apiClientProvider);
          await api.post('/calls/${state.callId}/connect');
        } catch (_) {}
      }
    } catch (e) {
      state = state.copyWith(
        status: CallStatus.error,
        error: 'Ошибка подключения: $e',
      );
    }
  }

  /// End the call.
  Future<void> endCall() async {
    if (state.callId != null) {
      try {
        final api = _ref.read(apiClientProvider);
        await api.post('/calls/${state.callId}/end');
      } catch (_) {}
    }
    await _disconnectRoom();
    state = const CallState();
  }

  Future<void> _disconnectRoom() async {
    _disconnectListener?.call();
    _disconnectListener = null;
    try {
      await _room?.disconnect();
    } catch (_) {}
    _room?.dispose();
    _room = null;
  }

  @override
  void dispose() {
    _disposed = true;
    _disconnectRoom();
    super.dispose();
  }
}

final callProvider = StateNotifierProvider<CallNotifier, CallState>((ref) {
  return CallNotifier(ref);
});
