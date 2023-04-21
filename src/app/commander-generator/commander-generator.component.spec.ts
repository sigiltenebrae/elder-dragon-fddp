import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommanderGeneratorComponent } from './commander-generator.component';

describe('CommanderGeneratorComponent', () => {
  let component: CommanderGeneratorComponent;
  let fixture: ComponentFixture<CommanderGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommanderGeneratorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommanderGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
