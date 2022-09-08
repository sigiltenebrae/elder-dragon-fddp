import { TestBed } from '@angular/core/testing';

import { RightclickHandlerServiceService } from './rightclick-handler-service.service';

describe('RightclickHandlerServiceService', () => {
  let service: RightclickHandlerServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RightclickHandlerServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
