import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/theme/theme.dart';
import '../../core/api/providers.dart';
import 'providers.dart';

class PhoneInputScreen extends ConsumerStatefulWidget {
  const PhoneInputScreen({super.key});

  @override
  ConsumerState<PhoneInputScreen> createState() => _PhoneInputScreenState();
}

class _PhoneInputScreenState extends ConsumerState<PhoneInputScreen> {
  void _openSocialAuth(String provider) {
    if (provider == 'vk' || provider == 'yandex') {
      context.push('/auth-social', extra: {'provider': provider});
    } else if (provider == 'email') {
      context.push('/auth-email-otp');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Вход')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset('assets/logo.png', height: 80, fit: BoxFit.contain),
              const SizedBox(height: 24),
              Text('Войдите, чтобы делать заказы',
                style: theme.textTheme.bodyMedium?.copyWith(color: GrilyageTheme.textWood)),
              const SizedBox(height: 32),

              _SocialButton(
                icon: Icons.vpn_key, label: 'VK ID',
                color: const Color(0xFF2787F5),
                onTap: () => _openSocialAuth('vk'),
              ),
              const SizedBox(height: 12),
              _SocialButton(
                icon: Icons.search, label: 'Яндекс ID',
                color: const Color(0xFFFC3F1D),
                onTap: () => _openSocialAuth('yandex'),
              ),
              const SizedBox(height: 12),
              _SocialButton(
                icon: Icons.email_outlined, label: 'Email (код на почту)',
                color: GrilyageTheme.gold,
                onTap: () => _openSocialAuth('email'),
              ),
              const SizedBox(height: 12),
              _SocialButton(
                icon: Icons.telegram, label: 'Telegram',
                color: const Color(0xFF27A7E7),
                onTap: () => context.push('/auth-telegram'),
              ),

              const SizedBox(height: 24),
              _SocialButton(
                icon: Icons.phone_android, label: 'Телефон (код в SMS)',
                color: GrilyageTheme.gold,
                onTap: () => context.push('/auth-phone-otp'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _SocialButton({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onTap,
        icon: Icon(icon, color: color, size: 22),
        label: Text(label,
          style: TextStyle(fontWeight: FontWeight.w600, color: GrilyageTheme.textWood)),
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: color.withValues(alpha: 0.3)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          backgroundColor: color.withValues(alpha: 0.05),
        ),
      ),
    );
  }
}

class CodeInputScreen extends ConsumerStatefulWidget {
  final String codeId;
  final String phone;
  final int? code;
  final String name;
  const CodeInputScreen({super.key, required this.codeId, required this.phone, this.code, this.name = ''});

  @override
  ConsumerState<CodeInputScreen> createState() => _CodeInputScreenState();
}

class _CodeInputScreenState extends ConsumerState<CodeInputScreen> {
  bool _polling = false;
  bool _done = false;
  String? _error;
  Timer? _timer;
  int _attempts = 0;

  @override
  void initState() {
    super.initState();
    if (widget.code != null) {
      Future.delayed(const Duration(seconds: 2), _startPolling);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startPolling() {
    if (!mounted || _done) return;
    setState(() => _polling = true);
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _checkResult());
  }

  Future<void> _checkResult() async {
    if (_done || !mounted) return;
    _attempts++;
    try {
      final api = ref.read(apiClientProvider);
      final resp = await api.post('/auth/result', data: {'codeId': widget.codeId});
      if (resp.data['auth'] == true) {
        _timer?.cancel();
        if (!mounted) return;
        _done = true;
        await ref.read(authStateProvider.notifier).completeAuth(
          widget.codeId, widget.name.isNotEmpty ? widget.name : null,
        );
        if (!mounted) return;
        context.go('/');
        return;
      }
      if (_attempts > 40 && mounted) {
        _timer?.cancel();
        setState(() {
          _polling = false;
          _error = 'Время ожидания истекло. Попробуйте снова.';
        });
      }
    } catch (_) {
      if (_attempts > 40 && mounted) {
        _timer?.cancel();
        setState(() {
          _polling = false;
          _error = 'Ошибка проверки. Попробуйте снова.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Подтверждение')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Код отправлен на ${widget.phone}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: GrilyageTheme.textWood,
                )),
              const SizedBox(height: 32),
              if (widget.code != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  decoration: BoxDecoration(
                    color: GrilyageTheme.border,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: GrilyageTheme.gold.withValues(alpha: 0.3)),
                  ),
                  child: Text('${widget.code}',
                    style: const TextStyle(fontSize: 42, fontWeight: FontWeight.bold,
                      letterSpacing: 8, color: GrilyageTheme.gold, fontFamily: 'monospace'),
                  ),
                ),
                const SizedBox(height: 8),
                Text('Скопируйте код и отправьте в Telegram бот Грильяж',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: GrilyageTheme.textWood,
                  )),
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () {
                    if (widget.code != null) {
                      Clipboard.setData(ClipboardData(text: '${widget.code}'));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Код скопирован!'), duration: Duration(seconds: 2)),
                      );
                    }
                  },
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Копировать код'),
                ),
              ] else ...[
                Text('Подтверждаем...',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: GrilyageTheme.textWood,
                  )),
              ],
              const SizedBox(height: 24),
              if (_polling) ...[
                const CircularProgressIndicator(color: GrilyageTheme.gold),
                const SizedBox(height: 12),
                Text('Ожидаем подтверждение...',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: GrilyageTheme.textWood,
                  )),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: GrilyageTheme.error, fontSize: 14)),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () {
                    setState(() { _error = null; _attempts = 0; });
                    _startPolling();
                  },
                  child: const Text('Повторить'),
                ),
              ],
              if (!_polling && _error == null && widget.code == null) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (!mounted) return;
                      await ref.read(authStateProvider.notifier).completeAuth(
                        widget.codeId, widget.name.isNotEmpty ? widget.name : null,
                      );
                      if (!mounted) return;
                      context.go('/');
                    },
                    child: const Text('Пропустить (тестовый режим)'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class SocialAuthScreen extends ConsumerStatefulWidget {
  final String provider;
  const SocialAuthScreen({super.key, required this.provider});

  @override
  ConsumerState<SocialAuthScreen> createState() => _SocialAuthScreenState();
}

class _SocialAuthScreenState extends ConsumerState<SocialAuthScreen> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    final urls = {
      'vk': 'https://id.vk.com/auth?redirect_uri=https://grillyage.ru/auth/vk/callback&response_type=token&client_id=PLACEHOLDER&v=5.131&scope=email,phone',
      'yandex': 'https://oauth.yandex.ru/authorize?response_type=token&client_id=PLACEHOLDER',
    };
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) { if (mounted) setState(() => _loading = false); },
        onUrlChange: (change) {
          final url = change.url ?? '';
          if (url.contains('access_token=')) {
            final uri = Uri.parse(url);
            final params = Uri.splitQueryString(uri.fragment);
            final token = params['access_token'];
            if (token != null) _handleToken(token);
          }
        },
      ))
      ..loadRequest(Uri.parse(urls[widget.provider]!));
  }

  Future<void> _handleToken(String token) async {
    try {
      final api = ref.read(apiClientProvider);
      final resp = await api.post('/auth/social/${widget.provider}', data: {'access_token': token});
      await api.setTokens(resp.data['accessToken'], resp.data['refreshToken']);
      if (!mounted) return;
      await ref.read(authStateProvider.notifier).fetchProfile();
      if (!mounted) return;
      context.go('/');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка авторизации: $e')),
        );
        context.pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.provider == 'vk' ? 'VK ID' : 'Яндекс ID';
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading) const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}

/// Telegram Login Widget — loads the official widget in a WebView
/// and captures the auth callback via JS bridge.
class TelegramAuthScreen extends ConsumerStatefulWidget {
  const TelegramAuthScreen({super.key});
  @override
  ConsumerState<TelegramAuthScreen> createState() => _TelegramAuthScreenState();
}

class _TelegramAuthScreenState extends ConsumerState<TelegramAuthScreen> {
  late final WebViewController _controller;
  bool _loading = true;

  /// The bot username used in the Telegram Login Widget.
  /// Replace with your actual bot username (e.g. 'GrilyageBot').
  /// The bot must be created via @BotFather and have the widget enabled.
  static const _botUsername = 'PLACEHOLDER_BOT';

  @override
  void initState() {
    super.initState();

    final html = '''
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head>
<body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#fff">
<script async src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="$_botUsername"
  data-size="large"
  data-onauth="onTelegramAuth(user)"
  data-request-access="write">
</script>
<script>
function onTelegramAuth(user) {
  TelegramLoginCallback.postMessage(JSON.stringify(user));
}
</script>
</body>
</html>
''';

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel('TelegramLoginCallback',
        onMessageReceived: (msg) {
          if (!mounted) return;
          try {
            final data = msg.message;
            _handleAuthData(data);
          } catch (_) {}
        },
      )
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (_) {
          if (mounted) setState(() => _loading = false);
        },
      ))
      ..loadHtmlString(html);
  }

  Future<void> _handleAuthData(String jsonStr) async {
    try {
      final api = ref.read(apiClientProvider);
      final resp = await api.post('/auth/social/telegram', data: jsonStr);
      await api.setTokens(resp.data['accessToken'], resp.data['refreshToken']);
      if (!mounted) return;
      await ref.read(authStateProvider.notifier).fetchProfile();
      if (!mounted) return;
      context.go('/');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка авторизации Telegram: $e')),
        );
        context.pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Telegram')),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading) const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}

class EmailOtpScreen extends ConsumerStatefulWidget {
  const EmailOtpScreen({super.key});

  @override
  ConsumerState<EmailOtpScreen> createState() => _EmailOtpScreenState();
}

class _EmailOtpScreenState extends ConsumerState<EmailOtpScreen> {
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  bool _codeSent = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final email = _emailController.text.trim();
    if (!email.contains('@')) { setState(() => _error = 'Введите корректный email'); return; }
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(apiClientProvider).post('/auth/social/send-email-otp', data: {'email': email});
      if (mounted) setState(() => _codeSent = true);
    } catch (e) {
      setState(() => _error = 'Ошибка отправки кода');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyCode() async {
    final email = _emailController.text.trim();
    final code = _codeController.text.trim();
    if (code.length != 6) { setState(() => _error = 'Введите 6-значный код'); return; }
    setState(() { _loading = true; _error = null; });
    try {
      final api = ref.read(apiClientProvider);
      final resp = await api.post('/auth/social/email-otp', data: {'email': email, 'code': code});
      await api.setTokens(resp.data['accessToken'], resp.data['refreshToken']);
      if (!mounted) return;
      await ref.read(authStateProvider.notifier).fetchProfile();
      if (!mounted) return;
      context.go('/');
    } catch (e) {
      setState(() => _error = 'Неверный код');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Вход по email')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.email_outlined, size: 64, color: GrilyageTheme.gold),
              const SizedBox(height: 24),
              Text(_codeSent ? 'Введите код из письма' : 'Введите email для входа',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: GrilyageTheme.textWood)),
              const SizedBox(height: 32),
              if (!_codeSent)
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email', hintText: 'mail@example.com'),
                )
              else ...[
                TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  decoration: const InputDecoration(labelText: 'Код из письма', hintText: '000000'),
                ),
                const SizedBox(height: 8),
                Text('Код отправлен на ${_emailController.text.trim()}',
                  style: TextStyle(color: GrilyageTheme.textWood, fontSize: 13)),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: GrilyageTheme.error, fontSize: 14)),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : (_codeSent ? _verifyCode : _sendCode),
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(_codeSent ? 'Войти' : 'Получить код'),
                ),
              ),
              if (_codeSent) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () { setState(() { _codeSent = false; _codeController.clear(); _error = null; }); },
                  child: const Text('Изменить email'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
