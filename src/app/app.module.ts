import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AngularFireModule } from 'angularfire2';
import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireAuthModule } from 'angularfire2/auth';
import { SlickModule } from 'ngx-slick';

import { environment } from './../environments/environment';
import { TaveApiService } from './services/tave-api.service'
import { EqualValidatorDirective } from './directives/equals-validator.directive';
import { CapitalizePipe } from './pipes/capitalize.pipe';

import { AppComponent } from './app.component';
import { HeroImageComponent } from './hero-image/hero-image.component';
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
import { TestimonialsComponent } from './testimonials/testimonials.component';
import { AppRoutingModule } from './/app-routing.module';

@NgModule({
  declarations: [
    CapitalizePipe,
    AppComponent,
    HeroImageComponent,
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
    HeaderComponent,
    TestimonialsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    SlickModule.forRoot()
  ],
  providers: [
    TaveApiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
