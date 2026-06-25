class Category {
  final String id;
  final String name;
  final String slug;
  final String? imageUrl;

  Category({required this.id, required this.name, required this.slug, this.imageUrl});

  factory Category.fromJson(Map<String, dynamic> json) => Category(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    imageUrl: json['imageUrl'] as String?,
  );
}

class MobileProduct {
  final String id;
  final String name;
  final String slug;
  final String description;
  final int price;
  final int weightGrams;
  final int kcal;
  final int protein;
  final int fat;
  final int carbs;
  final String? imageUrl;
  final bool isNew;
  final String categoryId;
  final String categoryName;
  final String categorySlug;
  final String subcategoryName;
  final String subcategorySlug;

  MobileProduct({
    required this.id, required this.name, required this.slug,
    required this.description, required this.price, required this.weightGrams,
    required this.kcal, required this.protein, required this.fat, required this.carbs,
    this.imageUrl, required this.isNew,
    required this.categoryId, required this.categoryName, required this.categorySlug,
    required this.subcategoryName, required this.subcategorySlug,
  });

  static int _toInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? 0;
    return 0;
  }

  factory MobileProduct.fromJson(Map<String, dynamic> json) => MobileProduct(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    description: json['description'] as String? ?? '',
    price: _toInt(json['price']),
    weightGrams: _toInt(json['weightGrams']),
    kcal: _toInt(json['kcal']),
    protein: _toInt(json['protein']),
    fat: _toInt(json['fat']),
    carbs: _toInt(json['carbs']),
    imageUrl: json['imageUrl'] as String?,
    isNew: json['isNew'] is bool ? json['isNew'] : false,
    categoryId: json['categoryId'] as String? ?? '',
    categoryName: json['categoryName'] as String? ?? '',
    categorySlug: json['categorySlug'] as String? ?? '',
    subcategoryName: json['subcategoryName'] as String? ?? '',
    subcategorySlug: json['subcategorySlug'] as String? ?? '',
  );

  String get priceFormatted => '${(price / 100).toStringAsFixed(2)} ₽';
}

class MenuResponse {
  final List<Category> categories;
  final List<MobileProduct> products;
  final List<Promotion> promotions;

  MenuResponse({
    required this.categories, required this.products, required this.promotions,
  });

  factory MenuResponse.fromJson(Map<String, dynamic> json) => MenuResponse(
    categories: (json['categories'] as List).map((e) => Category.fromJson(e)).toList(),
    products: (json['products'] as List).map((e) => MobileProduct.fromJson(e)).toList(),
    promotions: (json['promotions'] as List).map((e) => Promotion.fromJson(e)).toList(),
  );
}

class Promotion {
  final String id;
  final String title;
  final String? description;
  final String? imageUrl;
  final int? discountPercent;

  Promotion({required this.id, required this.title, this.description, this.imageUrl, this.discountPercent});

  factory Promotion.fromJson(Map<String, dynamic> json) => Promotion(
    id: json['id'] as String,
    title: json['title'] as String,
    description: json['description'] as String?,
    imageUrl: json['imageUrl'] as String?,
    discountPercent: json['discountPercent'] as int?,
  );
}

class AuthResponse {
  final String accessToken;
  final String refreshToken;

  AuthResponse({required this.accessToken, required this.refreshToken});

  factory AuthResponse.fromJson(Map<String, dynamic> json) => AuthResponse(
    accessToken: json['accessToken'] as String,
    refreshToken: json['refreshToken'] as String,
  );
}

class UserProfile {
  final String id;
  final String email;
  final String? phone;
  final String name;
  final String? emailVerifiedAt;

  UserProfile({required this.id, required this.email, this.phone, required this.name, this.emailVerifiedAt});

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    email: json['email'] as String,
    phone: json['phone'] as String?,
    name: json['name'] as String,
    emailVerifiedAt: json['emailVerifiedAt'] as String?,
  );
}
