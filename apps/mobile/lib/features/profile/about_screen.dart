import 'package:flutter/material.dart';
import '../../core/theme/theme.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('О приложении')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
              child: Column(
                children: [
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      color: GrilyageTheme.gold.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.cake, color: GrilyageTheme.gold, size: 36),
                  ),
                  const SizedBox(height: 16),
                  Text('Грильяж',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold, color: GrilyageTheme.textDark)),
                  const SizedBox(height: 4),
                  const Text('Версия 1.0.0',
                    style: TextStyle(color: GrilyageTheme.textMuted, fontSize: 14)),
                  const SizedBox(height: 12),
                  const Text(
                    'Приложение для заказа кондитерских изделий с доставкой.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: GrilyageTheme.textWood, fontSize: 15, height: 1.4),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Контакты',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  const _ContactRow(
                    icon: Icons.phone_outlined,
                    title: 'Телефон',
                    value: '+7 (999) 123-45-67',
                  ),
                  const Divider(height: 24),
                  const _ContactRow(
                    icon: Icons.location_on_outlined,
                    title: 'Адрес',
                    value: 'Омск, Харьковская, 7',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;

  const _ContactRow({required this.icon, required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: GrilyageTheme.gold.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: GrilyageTheme.gold, size: 20),
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: GrilyageTheme.textMuted, fontSize: 12)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 15)),
          ],
        ),
      ],
    );
  }
}
