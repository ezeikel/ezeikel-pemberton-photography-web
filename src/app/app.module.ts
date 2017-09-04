import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router'
import { HashLocationStrategy, LocationStrategy } from '@angular/common';

import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireModule } from 'angularfire2';
import { firebaseConfig } from './../environments/firebase.config';

import { TaveApiService } from './tave-api.service'

import { AppComponent } from './app.component';
import { HeroImageComponent } from './hero-image/hero-image.component';
import { HeroCarouselComponent } from './hero-carousel/hero-carousel.component';
import { HomeComponent } from './home/home.component';
import { TextComponent } from './text/text.component';
import { GalleryPreviewComponent } from './gallery-preview/gallery-preview.component';
import { ScrollDownComponent } from './scroll-down/scroll-down.component';
import { HamburgerMenuComponent } from './hamburger-menu/hamburger-menu.component';
import { ContactFormComponent } from './contact-form/contact-form.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  { path: '**', component: HomeComponent } //TODO: Replace with PageNotFoundComponent
]

@NgModule({
  declarations: [
    AppComponent,
    HeroImageComponent,
    HeroCarouselComponent,
    HomeComponent,
    TextComponent,
    GalleryPreviewComponent,
    ScrollDownComponent,
    HamburgerMenuComponent,
    ContactFormComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireDatabaseModule,
    RouterModule.forRoot(
      routes,
      { enableTracing: true }
    )
  ],
  providers: [
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    TaveApiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
