import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router'
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireModule } from 'angularfire2';
import { firebaseConfig } from './../environments/firebase.config';

import { TaveApiService } from './tave-api.service'
import { EqualValidator } from './equals-validator.directive';
import { CapitalizePipe } from './pipes/capitalize.pipe';

import { AppComponent } from './app.component';
import { HeroImageComponent } from './hero-image/hero-image.component';
import { HeroCarouselComponent } from './hero-carousel/hero-carousel.component';
import { HomeComponent } from './home/home.component';
import { WelcomeTextComponent } from './welcome-text/welcome-text.component';
import { GalleryPreviewComponent } from './gallery-preview/gallery-preview.component';
import { ScrollDownComponent } from './scroll-down/scroll-down.component';
import { ContactFormComponent } from './contact-form/contact-form.component';
import { BlogComponent } from './blog/blog.component';
import { CollectionComponent } from './collection/collection.component';
import { HeroHeaderComponent } from './hero-header/hero-header.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'get-in-touch', component: ContactFormComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'gallery/:collection', component: CollectionComponent },
  { path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  { path: '**', component: HomeComponent } //TODO: Replace with PageNotFoundComponent
]

@NgModule({
  declarations: [
    CapitalizePipe,
    AppComponent,
    HeroImageComponent,
    HeroCarouselComponent,
    HomeComponent,
    WelcomeTextComponent,
    GalleryPreviewComponent,
    ScrollDownComponent,
    ContactFormComponent,
    EqualValidator,
    BlogComponent,
    CollectionComponent,
    HeroHeaderComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
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
