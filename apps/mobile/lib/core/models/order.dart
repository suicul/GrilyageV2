class Order {
  final String id;
  final int total;
  final String status;
  final String? address;
  final String? comment;
  final String createdAt;
  final String updatedAt;
  final List<OrderItem> items;

  Order({
    required this.id, required this.total, required this.status,
    this.address, this.comment, required this.createdAt, required this.updatedAt,
    required this.items,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
    id: json['id'] as String,
    total: json['total'] as int,
    status: json['status'] as String,
    address: json['address'] as String?,
    comment: json['comment'] as String?,
    createdAt: json['createdAt'] as String,
    updatedAt: json['updatedAt'] as String,
    items: (json['items'] as List).map((e) => OrderItem.fromJson(e)).toList(),
  );

  String get totalFormatted => '${(total / 100).toStringAsFixed(2)} ₽';
  String get statusLabel => _statusLabels[status] ?? status;
  String get statusColor => _statusColors[status] ?? '#D6B06A';

  bool get isActive => !['CANCELLED', 'COMPLETED'].contains(status);
}

class OrderItem {
  final String name;
  final int quantity;
  final int price;

  OrderItem({required this.name, required this.quantity, required this.price});

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
    name: json['name'] as String,
    quantity: json['quantity'] as int,
    price: json['price'] as int,
  );
}

class Address {
  final String id;
  final String label;
  final String street;
  final String? apartment;
  final double lat;
  final double lng;
  final bool isDefault;

  Address({
    required this.id, required this.label, required this.street,
    this.apartment, required this.lat, required this.lng, required this.isDefault,
  });

  factory Address.fromJson(Map<String, dynamic> json) => Address(
    id: json['id'] as String,
    label: json['label'] as String,
    street: json['street'] as String,
    apartment: json['apartment'] as String?,
    lat: (json['lat'] as num).toDouble(),
    lng: (json['lng'] as num).toDouble(),
    isDefault: json['isDefault'] as bool? ?? false,
  );
}

const _statusLabels = {
  'NEW': 'Новый',
  'CONFIRMED': 'Подтверждён',
  'COOKING': 'Готовится',
  'DELIVERING': 'В пути',
  'READY_FOR_PICKUP': 'Готов к выдаче',
  'COMPLETED': 'Доставлен',
  'CANCELLED': 'Отменён',
};

const _statusColors = {
  'NEW': '#D6B06A',
  'CONFIRMED': '#6BCF7F',
  'COOKING': '#4A9EFF',
  'DELIVERING': '#FF9F43',
  'READY_FOR_PICKUP': '#6BCF7F',
  'COMPLETED': '#6BCF7F',
  'CANCELLED': '#E55A5A',
};
