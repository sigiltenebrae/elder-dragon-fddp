import { TestBed } from '@angular/core/testing';

import { FddpWebsocketService } from './fddp-websocket.service';

describe('FddpWebsocketService', () => {
  let service: FddpWebsocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FddpWebsocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
