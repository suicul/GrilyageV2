import 'package:flutter/material.dart';

class GrilyageCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;

  const GrilyageCard({super.key, required this.child, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: child,
        ),
      ),
    );
  }
}
