import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefaultImagesComponent } from './default-images.component';

describe('DefaultImagesComponent', () => {
  let component: DefaultImagesComponent;
  let fixture: ComponentFixture<DefaultImagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DefaultImagesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DefaultImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
