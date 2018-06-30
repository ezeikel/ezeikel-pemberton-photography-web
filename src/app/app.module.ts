import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AngularFireModule } from 'angularfire2';
import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireStorageModule } from 'angularfire2/storage';

import { environment } from './../environments/environment';
import { TaveApiService } from './services/tave-api.service'
import { FirebaseService } from './services/firebase.service';
import { EqualValidatorDirective } from './directives/equals-validator.directive';
import { CapitalizePipe } from './pipes/capitalize.pipe';

import { AppComponent } from './app.component';
import { HeroCarouselComponent } from './hero-carousel/hero-carousel.component';
import { HomeComponent } from './home/home.component';
import { BlogPreviewComponent } from './blog-preview/blog-preview.component';
import { ScrollDownComponent } from './scroll-down/scroll-down.component';
import { ContactFormComponent } from './contact-form/contact-form.component';
import { BlogComponent } from './blog/blog.component';
import { BlogPostComponent } from './blog-post/blog-post.component';
import { HeroHeaderComponent } from './hero-header/hero-header.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { AppRoutingModule } from './/app-routing.module';

@NgModule({
  declarations: [
    CapitalizePipe,
    AppComponent,
    HeroCarouselComponent,
    HomeComponent,
    BlogPreviewComponent,
    ScrollDownComponent,
    ContactFormComponent,
    EqualValidatorDirective,
    BlogComponent,
    BlogPostComponent,
    HeroHeaderComponent,
    FooterComponent,
    HeaderComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase), // imports firebase/app needed for everything
    AngularFireDatabaseModule, // imports firebase/database, only needed for database features
    AngularFireStorageModule // imports firebase/storage only needed for storage features
  ],
  providers: [
    TaveApiService,
    FirebaseService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
