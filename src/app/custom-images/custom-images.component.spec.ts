import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomImagesComponent } from './custom-images.component';

describe('CustomImagesComponent', () => {
  let component: CustomImagesComponent;
  let fixture: ComponentFixture<CustomImagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomImagesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
