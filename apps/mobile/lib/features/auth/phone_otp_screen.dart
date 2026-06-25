import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/theme.dart';
import '../../core/api/providers.dart';
import 'providers.dart';

class PhoneOtpScreen extends ConsumerStatefulWidget {
  const PhoneOtpScreen({super.key});

  @override
  ConsumerState<PhoneOtpScreen> createState() => _PhoneOtpScreenState();
}

class _PhoneOtpScreenState extends ConsumerState<PhoneOtpScreen> {
  final _phoneController = TextEditingController(text: '+7');
  final _codeController = TextEditingController();
  bool _codeSent = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final phone = _phoneController.text.trim();
    if (phone.length < 10) {
      setState(() => _error = 'Введите корректный номер телефона');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(apiClientProvider).post(
        '/auth/social/send-phone-otp',
        data: {'phone': phone},
      );
      if (mounted) setState(() => _codeSent = true);
    } catch (e) {
      setState(() => _error = 'Ошибка отправки кода. Попробуйте позже.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyCode() async {
    final phone = _phoneController.text.trim();
    final code = _codeController.text.trim();
    if (code.length != 6 || int.tryParse(code) == null) {
      setState(() => _error = 'Введите 6-значный код');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final api = ref.read(apiClientProvider);
      final resp = await api.post('/auth/social/phone-otp', data: {
        'phone': phone,
        'code': code,
      });
      await api.setTokens(resp.data['accessToken'], resp.data['refreshToken']);
      if (!mounted) return;
      await ref.read(authStateProvider.notifier).fetchProfile();
      if (!mounted) return;
      context.go('/');
    } catch (e) {
      setState(() => _error = 'Неверный код. Попробуйте снова.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Вход по телефону')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.phone_android, size: 64, color: GrilyageTheme.gold),
              const SizedBox(height: 24),
              Text(
                _codeSent ? 'Введите код из SMS' : 'Введите номер телефона',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: GrilyageTheme.textWood,
                ),
              ),
              const SizedBox(height: 32),
              if (!_codeSent)
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Телефон',
                    hintText: '+7 (999) 123-45-67',
                  ),
                )
              else ...[
                TextField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 28, fontWeight: FontWeight.bold,
                    letterSpacing: 8, fontFamily: 'monospace',
                  ),
                  decoration: const InputDecoration(
                    labelText: 'Код из SMS',
                    hintText: '000000',
                    counterText: '',
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Код отправлен на ${_phoneController.text.trim()}',
                  style: const TextStyle(color: GrilyageTheme.textWood, fontSize: 13),
                ),
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
                  onPressed: () {
                    setState(() { _codeSent = false; _codeController.clear(); _error = null; });
                  },
                  child: const Text('Изменить номер'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
