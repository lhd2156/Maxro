import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PublicConfigService } from './public-config.service';

describe('PublicConfigService', () => {
  let service: PublicConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PublicConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PublicConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and trims public client ids', async () => {
    const loadPromise = service.load();
    const request = httpMock.expectOne('http://localhost:8080/api/public-config');

    request.flush({
      googleClientId: ' test-google.apps.googleusercontent.com ',
      spotifyClientId: ' test-spotify-client-id ',
    });

    await loadPromise;

    expect(service.googleClientId).toBe('test-google.apps.googleusercontent.com');
    expect(service.spotifyClientId).toBe('test-spotify-client-id');
  });

  it('falls back to blank ids when the endpoint is unavailable', async () => {
    const loadPromise = service.load();
    const request = httpMock.expectOne('http://localhost:8080/api/public-config');

    request.flush('boom', { status: 500, statusText: 'Server Error' });

    await loadPromise;

    expect(service.googleClientId).toBe('');
    expect(service.spotifyClientId).toBe('');
  });
});