import 'package:flutter/material.dart';

/// Grilyage brand design system — shared theme for mobile and courier apps.
class GrilyageTheme {
  // ─── Brand Colors ───
  static const Color gold = Color(0xFFD6B06A);
  static const Color goldLight = Color(0xFFEAD4A0);
  static const Color cream = Color(0xFFF6F1E7);
  static const Color creamLight = Color(0xFFFBF8F2);
  static const Color white = Color(0xFFFEFDFB);
  static const Color textDark = Color(0xFF2F261F);
  static const Color textWood = Color(0xFF7B6147);
  static const Color textMuted = Color(0xFFA79882);
  static const Color border = Color(0xFFEADFCF);
  static const Color surfaceCard = Color(0xFFFFFDF8);
  static const Color error = Color(0xFFE55A5A);
  static const Color success = Color(0xFF4CAF50);

  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorSchemeSeed: gold,
        scaffoldBackgroundColor: cream,
        appBarTheme: const AppBarTheme(
          backgroundColor: cream,
          foregroundColor: textDark,
          elevation: 0,
          centerTitle: true,
        ),
        bottomNavigationBarTheme: BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: gold,
          unselectedItemColor: textMuted,
          type: BottomNavigationBarType.fixed,
          elevation: 8,
          enableFeedback: true,
        ),
        cardTheme: CardThemeData(
          color: surfaceCard,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: border, width: 0.5),
          ),
          elevation: 0,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: gold,
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16)),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
            elevation: 0,
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: textDark,
            side: const BorderSide(color: border),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16)),
            minimumSize: const Size(double.infinity, 48),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: creamLight,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: gold, width: 2),
          ),
          labelStyle: const TextStyle(color: textWood),
          hintStyle: TextStyle(color: textMuted.withValues(alpha: 0.7)),
        ),
        dividerTheme: const DividerThemeData(color: border, thickness: 1),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: textDark,
          contentTextStyle: const TextStyle(color: Colors.white),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: gold,
          foregroundColor: Colors.white,
        ),
      );
}
