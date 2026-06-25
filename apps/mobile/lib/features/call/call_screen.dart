import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:livekit_client/livekit_client.dart';
import '../../core/theme/theme.dart';
import 'providers.dart';

class CallScreen extends ConsumerStatefulWidget {
  const CallScreen({super.key});

  @override
  ConsumerState<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends ConsumerState<CallScreen> {
  bool _microphoneEnabled = true;
  bool _speakerEnabled = false;

  @override
  void initState() {
    super.initState();
    // Start enqueue when the screen opens
    Future.microtask(() => ref.read(callProvider.notifier).enqueue());
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(callProvider);

    return Scaffold(
      backgroundColor: GrilyageTheme.textDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => _onClose(state),
        ),
        title: Text(
          _appBarTitle(state),
          style: const TextStyle(color: Colors.white, fontSize: 16),
        ),
      ),
      body: SafeArea(
        child: _buildBody(state),
      ),
    );
  }

  String _appBarTitle(CallState state) {
    switch (state.status) {
      case CallStatus.queued:
      case CallStatus.waiting:
        return 'Ожидание оператора';
      case CallStatus.connecting:
        return 'Подключение...';
      case CallStatus.active:
        return 'Разговор с оператором';
      case CallStatus.ended:
        return 'Звонок завершён';
      case CallStatus.error:
        return 'Ошибка';
      case CallStatus.idle:
        return 'Звонок';
    }
  }

  Widget _buildBody(CallState state) {
    switch (state.status) {
      case CallStatus.idle:
      case CallStatus.queued:
        return const _LoadingView();
      case CallStatus.waiting:
        return _WaitingView(position: state.position);
      case CallStatus.connecting:
        return const _LoadingView();
      case CallStatus.active:
        return _ActiveCallView(
          room: state.room,
          microphoneEnabled: _microphoneEnabled,
          speakerEnabled: _speakerEnabled,
          onToggleMicrophone: _toggleMicrophone,
          onToggleSpeaker: _toggleSpeaker,
          onEndCall: () => ref.read(callProvider.notifier).endCall(),
        );
      case CallStatus.ended:
        return _EndedView(onReturn: () => context.pop());
      case CallStatus.error:
        return _ErrorView(
          message: state.error ?? 'Неизвестная ошибка',
          onRetry: () => ref.read(callProvider.notifier).enqueue(),
          onReturn: () => context.pop(),
        );
    }
  }

  Future<void> _onClose(CallState state) async {
    if (state.status == CallStatus.active || state.status == CallStatus.waiting) {
      await ref.read(callProvider.notifier).dequeue();
    }
    if (mounted) context.pop();
  }

  void _toggleMicrophone() async {
    setState(() => _microphoneEnabled = !_microphoneEnabled);
    final room = ref.read(callProvider).room;
    await room?.localParticipant?.setMicrophoneEnabled(_microphoneEnabled);
  }

  void _toggleSpeaker() {
    setState(() => _speakerEnabled = !_speakerEnabled);
    // On mobile, this switches between earpiece and speaker
    // LiveKit handles this via the audio output route
  }
}

/* ─── Sub-widgets ─── */

class _LoadingView extends StatelessWidget {
  const _LoadingView();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(color: GrilyageTheme.gold),
          SizedBox(height: 24),
          Text(
            'Подключаем к оператору...',
            style: TextStyle(color: Colors.white70, fontSize: 16),
          ),
        ],
      ),
    );
  }
}

class _WaitingView extends StatelessWidget {
  final int? position;

  const _WaitingView({this.position});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.headset_mic, size: 80, color: GrilyageTheme.gold),
            const SizedBox(height: 24),
            const Text(
              'Вы в очереди',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              position != null
                  ? 'Ваша позиция: $position'
                  : 'Ожидайте, оператор скоро ответит',
              style: const TextStyle(color: Colors.white70, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Пожалуйста, оставайтесь на линии',
              style: TextStyle(color: Colors.white38, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            const SizedBox(
              width: 40, height: 40,
              child: CircularProgressIndicator(
                color: GrilyageTheme.gold,
                strokeWidth: 3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActiveCallView extends StatelessWidget {
  final Room? room;
  final bool microphoneEnabled;
  final bool speakerEnabled;
  final VoidCallback onToggleMicrophone;
  final VoidCallback onToggleSpeaker;
  final VoidCallback onEndCall;

  const _ActiveCallView({
    required this.room,
    required this.microphoneEnabled,
    required this.speakerEnabled,
    required this.onToggleMicrophone,
    required this.onToggleSpeaker,
    required this.onEndCall,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Spacer(),
        // Remote participant video (if available) or avatar placeholder
        Expanded(
          child: Center(
            child: _remoteParticipantWidget(),
          ),
        ),
        const Spacer(),
        // Call controls
        _CallControls(
          microphoneEnabled: microphoneEnabled,
          speakerEnabled: speakerEnabled,
          onToggleMicrophone: onToggleMicrophone,
          onToggleSpeaker: onToggleSpeaker,
          onEndCall: onEndCall,
        ),
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _remoteParticipantWidget() {
    if (room == null) return const SizedBox.shrink();

    final participants = room!.remoteParticipants.values;
    if (participants.isEmpty) {
      // Waiting for operator video
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircleAvatar(
            radius: 48,
            backgroundColor: Colors.white12,
            child: Icon(Icons.person, size: 48, color: GrilyageTheme.gold),
          ),
          const SizedBox(height: 16),
          Text(
            'Оператор на линии',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.8),
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }

    // Show first remote participant video
    final participant = participants.first;
    final videoPub = participant.videoTrackPublications.where(
      (pub) => pub.subscribed && pub.track != null,
    ).firstOrNull;

    if (videoPub?.track != null) {
      return VideoTrackRenderer(videoPub!.track!, fit: VideoViewFit.contain);
    }

    // Audio-only: show avatar
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 48,
          backgroundColor: Colors.white12,
          child: Text(
            participant.identity.isNotEmpty
                ? participant.identity[0].toUpperCase()
                : 'O',
            style: const TextStyle(fontSize: 32, color: GrilyageTheme.gold),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Оператор',
          style: TextStyle(color: Colors.white70, fontSize: 18),
        ),
      ],
    );
  }
}

class _CallControls extends StatelessWidget {
  final bool microphoneEnabled;
  final bool speakerEnabled;
  final VoidCallback onToggleMicrophone;
  final VoidCallback onToggleSpeaker;
  final VoidCallback onEndCall;

  const _CallControls({
    required this.microphoneEnabled,
    required this.speakerEnabled,
    required this.onToggleMicrophone,
    required this.onToggleSpeaker,
    required this.onEndCall,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Microphone toggle
        _ControlButton(
          icon: microphoneEnabled ? Icons.mic : Icons.mic_off,
          label: microphoneEnabled ? 'Микрофон' : 'Выкл.',
          color: microphoneEnabled ? Colors.white : Colors.redAccent,
          onTap: onToggleMicrophone,
        ),
        const SizedBox(width: 24),
        // End call
        _ControlButton(
          icon: Icons.call_end,
          label: 'Завершить',
          color: Colors.redAccent,
          iconSize: 32,
          size: 64,
          onTap: onEndCall,
        ),
        const SizedBox(width: 24),
        // Speaker toggle
        _ControlButton(
          icon: speakerEnabled ? Icons.volume_up : Icons.volume_down,
          label: speakerEnabled ? 'Динамик' : 'Наушник',
          color: speakerEnabled ? GrilyageTheme.gold : Colors.white,
          onTap: onToggleSpeaker,
        ),
      ],
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final double iconSize;
  final double size;
  final VoidCallback onTap;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.color,
    this.iconSize = 24,
    this.size = 48,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: iconSize),
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12)),
        ],
      ),
    );
  }
}

class _EndedView extends StatelessWidget {
  final VoidCallback onReturn;

  const _EndedView({required this.onReturn});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.call_end, size: 80, color: Colors.white38),
            const SizedBox(height: 24),
            const Text(
              'Звонок завершён',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Спасибо за обращение!',
              style: TextStyle(color: Colors.white54, fontSize: 16),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: onReturn,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(200, 48),
              ),
              child: const Text('Вернуться'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  final VoidCallback onReturn;

  const _ErrorView({
    required this.message,
    required this.onRetry,
    required this.onReturn,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.redAccent),
            const SizedBox(height: 16),
            Text(
              message,
              style: const TextStyle(color: Colors.white70, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(200, 48),
              ),
              child: const Text('Повторить'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: onReturn,
              child: const Text(
                'Вернуться',
                style: TextStyle(color: Colors.white54),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
