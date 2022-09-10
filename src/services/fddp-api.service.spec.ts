import { TestBed } from '@angular/core/testing';

import { FddpApiService } from './fddp-api.service';

describe('FddpApiService', () => {
  let service: FddpApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FddpApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
