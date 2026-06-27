import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeocoderResult {
  latitude: number;
  longitude: number;
  fullAddress: string;
}

@Injectable()
export class GeocoderService {
  private readonly logger = new Logger(GeocoderService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://geocode-maps.yandex.ru/1.x/';

  constructor(private readonly config: ConfigService) {
    // Try the API-side key first, fall back to the public key
    this.apiKey = this.config.get<string>('YANDEX_MAPS_API_KEY')
      ?? this.config.get<string>('NEXT_PUBLIC_YANDEX_MAPS_API_KEY', '');
  }

  /**
   * Geocode a free-form address string to coordinates.
   * Returns null on failure or when the API key is missing.
   */
  async geocode(address: string): Promise<GeocoderResult | null> {
    if (!this.apiKey) {
      this.logger.warn('YANDEX_MAPS_API_KEY is not configured — skipping geocoding');
      return null;
    }

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('apikey', this.apiKey);
      url.searchParams.set('geocode', address);
      url.searchParams.set('format', 'json');
      url.searchParams.set('results', '1');
      url.searchParams.set('lang', 'ru_RU');

      const res = await fetch(url.toString());
      if (!res.ok) {
        this.logger.error(`Geocoder API error: ${res.status} ${res.statusText}`);
        return null;
      }

      const data: any = await res.json();

      const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
      const fullAddr = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.metaDataProperty
        ?.GeocoderMetaData?.text;

      if (!pos) {
        this.logger.warn(`No results for address: "${address}"`);
        return null;
      }

      const [lng, lat] = pos.split(' ').map(Number);
      return { latitude: lat, longitude: lng, fullAddress: fullAddr ?? address };
    } catch (err) {
      this.logger.error(`Geocoder request failed: ${err}`);
      return null;
    }
  }
}
