/// API configuration
class ApiConfig {
  static const String mobileBaseUrl = 'https://grillyage.ru/api/v1/mobile';
  static const String courierBaseUrl = 'https://grillyage.ru/api/v1';
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String staffTokenKey = 'staff_token';
}

/// Storage box names for Hive
class StorageBoxes {
  static const String apiCache = 'api_cache';
  static const String menuCache = 'menu_cache';
  static const String cart = 'cart';
}

/// Order status labels in Russian
const Map<String, String> orderStatusLabels = {
  'NEW': 'Новый',
  'CONFIRMED': 'Подтверждён',
  'COOKING': 'Готовится',
  'DELIVERING': 'В пути',
  'READY_FOR_PICKUP': 'Готов к выдаче',
  'COMPLETED': 'Доставлен',
  'CANCELLED': 'Отменён',
};

/// Order status colors (hex values)
const Map<String, String> orderStatusColors = {
  'NEW': '#D6B06A',
  'CONFIRMED': '#6BCF7F',
  'COOKING': '#4A9EFF',
  'DELIVERING': '#FF9F43',
  'READY_FOR_PICKUP': '#6BCF7F',
  'COMPLETED': '#6BCF7F',
  'CANCELLED': '#E55A5A',
};

/// Statuses where the order is still in progress
const Set<String> activeStatuses = {
  'NEW', 'CONFIRMED', 'COOKING', 'DELIVERING', 'READY_FOR_PICKUP',
};

/// Statuses that can transition forward (courier app)
const Map<String, List<String>> courierStatusTransitions = {
  'CONFIRMED': ['COOKING'],
  'COOKING': ['READY_FOR_PICKUP'],
  'READY_FOR_PICKUP': ['DELIVERING'],
  'DELIVERING': ['COMPLETED'],
};

/// Format kopecks to ruble string (e.g. 35000 → "350.00 ₽")
String formatPrice(int kopecks) {
  final rubles = kopecks / 100;
  return '${rubles.toStringAsFixed(2)} ₽';
}

/// Parse nullable int from dynamic JSON value
int safeInt(dynamic v, {int fallback = 0}) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v) ?? fallback;
  return fallback;
}

/// Parse nullable double from dynamic JSON value
double safeDouble(dynamic v, {double fallback = 0.0}) {
  if (v is double) return v;
  if (v is int) return v.toDouble();
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v) ?? fallback;
  return fallback;
}

/// Parse nullable bool from dynamic JSON value
bool safeBool(dynamic v, {bool fallback = false}) {
  if (v is bool) return v;
  if (v is int) return v == 1;
  if (v is String) return v.toLowerCase() == 'true';
  return fallback;
}
