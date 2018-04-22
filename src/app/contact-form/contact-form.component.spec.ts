import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { TaveApiService } from '../services/tave-api.service';

import { ContactFormComponent } from './contact-form.component';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CapitalizePipe } from '../pipes/capitalize.pipe';

describe('ContactFormComponent', () => {
  let component: ContactFormComponent;
  let fixture: ComponentFixture<ContactFormComponent>;
  let taveApiService: TaveApiService
  let de, element;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        FormsModule
      ],
      declarations: [
        ContactFormComponent,
        HeaderComponent,
        FooterComponent,
        CapitalizePipe
      ],
      providers: [
        TaveApiService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    taveApiService = TestBed.get(TaveApiService);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    de = fixture.debugElement;

    fixture.detectChanges();
  }));

  it('should be created', async(() => {
    expect(component).toBeTruthy();
  }));

  it('uppercaseFirstLetter() should return string with uppercase first letter', async(() => {
    expect(component.uppercaseFirstLetter('ezeikel')).toBe('Ezeikel');
  }));

  it('should call taveApiService.createLead() on form submission', async(() => {
    component.lead = {
      SecretKey: 'dghsdgdgt234534t23',
      FirstName: 'Sean',
      LastName: 'Carter',
      Email: 'seancarter@rocnation.com',
      EmailConfirm: 'seancarter@rocnation.com',
      MobilePhone: 4477777777777,
      Message: 'Big Pimpin`',
      JobType: 'Wedding',
      EventDate: '15/11/2020'
    };
    
    spyOn(taveApiService, 'createLead').and.returnValue({
      JobId: 5364059,
      Status: 'success'
    });

    component.onSubmit();
    expect(taveApiService.createLead).toHaveBeenCalled();
  }));

  it('change submitted to be true after form submit', async(() => {
    component.lead = {
      SecretKey: 'dghsdgdgt234534t23',
      FirstName: 'Sean',
      LastName: 'Carter',
      Email: 'seancarter@rocnation.com',
      EmailConfirm: 'seancarter@rocnation.com',
      MobilePhone: 4477777777777,
      Message: 'Big Pimpin`',
      JobType: 'Wedding',
      EventDate: '15/11/2020'
    };
    
    spyOn(taveApiService, 'createLead').and.returnValue({
      JobId: 5364059,
      Status: 'success'
    });

    expect(component.submitted).toBeFalsy();
    expect(component.onSubmit()).toBeTruthy();
    expect(taveApiService.createLead).toHaveBeenCalled();
    expect(component.submitted).toBeTruthy();
  }));

});
