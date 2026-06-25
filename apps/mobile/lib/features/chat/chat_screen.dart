import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/theme.dart';
import 'providers.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(chatProvider.notifier).init());
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isSending) return;
    _isSending = true;
    _controller.clear();
    await ref.read(chatProvider.notifier).sendMessage(text);
    _isSending = false;
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_appBarTitle(state)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/profile'),
        ),
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(state.error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.read(chatProvider.notifier).init(),
                        child: const Text('Повторить'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    Expanded(child: _messageList(state)),
                    if (state.operatorIsTyping)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        child: Row(
                          children: [
                            Text('Оператор печатает...',
                              style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      ),
                    _inputBar(state),
                  ],
                ),
    );
  }

  String _appBarTitle(ChatState state) {
    if (state.room == null) return 'Чат с оператором';
    switch (state.room!.status) {
      case 'ASSIGNED': return 'Чат с оператором';
      case 'CLOSED': return 'Чат закрыт';
      default: return 'Ожидание оператора';
    }
  }

  Widget _messageList(ChatState state) {
    if (state.messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text('Напишите нам, и мы ответим в ближайшее время',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[500], fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: state.messages.length,
      itemBuilder: (context, i) {
        final msg = state.messages[i];
        final isUser = msg.isFromUser;
        return Align(
          alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
            decoration: BoxDecoration(
              color: isUser ? GrilyageTheme.gold : Colors.grey[200],
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: isUser ? const Radius.circular(16) : Radius.zero,
                bottomRight: isUser ? Radius.zero : const Radius.circular(16),
              ),
            ),
            child: Text(
              msg.text,
              style: TextStyle(
                color: isUser ? Colors.white : Colors.black87,
                fontSize: 15,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _inputBar(ChatState state) {
    final isClosed = state.room?.status == 'CLOSED';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _controller,
              enabled: !isClosed,
              decoration: InputDecoration(
                hintText: isClosed ? 'Чат закрыт' : 'Сообщение...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                filled: true,
                fillColor: Colors.grey[100],
              ),
              textInputAction: TextInputAction.send,
              onChanged: (_) {
                if (state.room?.status != 'CLOSED') {
                  ref.read(chatProvider.notifier).onTyping();
                }
              },
              onSubmitted: isClosed ? null : (_) => _send(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: isClosed ? null : _send,
            icon: Icon(Icons.send_rounded, color: isClosed ? Colors.grey : GrilyageTheme.gold),
            style: IconButton.styleFrom(
              backgroundColor: GrilyageTheme.gold.withValues(alpha: 0.1),
            ),
          ),
        ],
      ),
    );
  }
}
