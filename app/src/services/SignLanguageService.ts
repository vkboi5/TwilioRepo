interface ServiceConfig {
    signedLanguage?: string;
    spokenLanguage?: string;
    cacheSize?: number;
  }
  
  interface CacheEntry {
    text: string;
    url: string;
    timestamp: number;
  }
  
  class SignLanguageService {
    private baseUrl: string = 'https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose';
    private signedLanguage: string = 'ase';
    private spokenLanguage: string = 'en';
    private cache: Map<string, CacheEntry>;
    private maxCacheSize: number = 50;
    private cacheTTL: number = 24 * 60 * 60 * 1000;
  
    constructor() {
      this.cache = new Map<string, CacheEntry>();
    }
  
    public getSignedPoseUrl(text: string): string {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }
  
      const cacheKey = this.generateCacheKey(text);
      const cachedEntry = this.getFromCache(cacheKey);
      
      if (cachedEntry) {
        return cachedEntry.url;
      }
  
      const url = `${this.baseUrl}?text=${encodeURIComponent(text.trim())}&spoken=${this.spokenLanguage}&signed=${this.signedLanguage}`;
      this.addToCache(cacheKey, text, url);
      return url;
    }
  
    public splitSpokenSentences(text: string): string[] {
      if (!text || typeof text !== 'string') {
        return [];
      }
      
      return text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
  
    public configure(config: ServiceConfig): void {
      try {
        if (config.signedLanguage) {
          this.validateLanguageCode(config.signedLanguage, 'signedLanguage');
          this.signedLanguage = config.signedLanguage;
        }
        if (config.spokenLanguage) {
          this.validateLanguageCode(config.spokenLanguage, 'spokenLanguage');
          this.spokenLanguage = config.spokenLanguage;
        }
        if (config.cacheSize && config.cacheSize > 0) {
          this.maxCacheSize = config.cacheSize;
          this.trimCache();
        }
      } catch (error) {
        console.error('Configuration error:', error);
        throw error;
      }
    }
  
    public getConfig(): { signedLanguage: string; spokenLanguage: string; cacheSize: number } {
      return {
        signedLanguage: this.signedLanguage,
        spokenLanguage: this.spokenLanguage,
        cacheSize: this.maxCacheSize,
      };
    }
  
    public clearCache(): void {
      this.cache.clear();
    }
  
    public getCacheSize(): number {
      return this.cache.size;
    }
  
    private generateCacheKey(text: string): string {
      return `${this.spokenLanguage}:${this.signedLanguage}:${text.trim().toLowerCase()}`;
    }
  
    private getFromCache(key: string): CacheEntry | undefined {
      const entry = this.cache.get(key);
      if (entry && Date.now() - entry.timestamp < this.cacheTTL) {
        return entry;
      }
      if (entry) {
        this.cache.delete(key);
      }
      return undefined;
    }
  
    private addToCache(key: string, text: string, url: string): void {
      if (this.cache.size >= this.maxCacheSize) {
        this.trimCache();
      }
      this.cache.set(key, {
        text,
        url,
        timestamp: Date.now(),
      });
    }
  
    private trimCache(): void {
      const entries = Array.from(this.cache.entries());
      if (entries.length <= this.maxCacheSize) return;
  
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.length - this.maxCacheSize;
      
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  
    private validateLanguageCode(code: string, field: string): void {
      if (!/^[a-z]{2,3}$/.test(code)) {
        throw new Error(`Invalid ${field} code: ${code}. Must be 2-3 lowercase letters.`);
      }
    }
  
    public async fetchPoseData(text: string): Promise<unknown> {
      const url = this.getSignedPoseUrl(text);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching pose data:', error);
        throw error;
      }
    }
  }
  
export default new SignLanguageService();