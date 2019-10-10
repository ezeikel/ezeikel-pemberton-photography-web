import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";

import { environment } from "../environments/environment";

// services
import { TaveApiService } from "./services/tave-api.service";
import { UiService } from "./services/ui.service";
import { ContentfulService } from "./services/contentful.service";

// components
import { AppComponent } from "./app.component";
import { HeroCarouselComponent } from "./hero-carousel/hero-carousel.component";
import { HomeComponent } from "./home/home.component";
import { LatestUpdatesComponent } from "./latest-updates/latest-updates.component";
import { ScrollDownComponent } from "./scroll-down/scroll-down.component";
import { ContactFormComponent } from "./contact-form/contact-form.component";
import { BlogComponent } from "./blog/blog.component";
import { BlogPostComponent } from "./blog-post/blog-post.component";
import { FooterComponent } from "./footer/footer.component";
import { HeaderComponent } from "./header/header.component";
import { AppRoutingModule } from "./app-routing.module";
import { HamburgerComponent } from "./hamburger/hamburger.component";
import { DetailsComponent } from "./details/details.component";
import { ContactComponent } from "./contact/contact.component";
import { LogoComponent } from "./logo/logo.component";
import { BlogPreviewComponent } from "./blog-preview/blog-preview.component";

// directives
import { EqualValidatorDirective } from "./directives/equals-validator.directive";

// pipes
import { CapitalizePipe } from "./pipes/capitalize.pipe";

@NgModule({
  declarations: [
    CapitalizePipe,
    AppComponent,
    HeroCarouselComponent,
    HomeComponent,
    LatestUpdatesComponent,
    ScrollDownComponent,
    ContactFormComponent,
    EqualValidatorDirective,
    BlogComponent,
    BlogPostComponent,
    FooterComponent,
    HeaderComponent,
    HamburgerComponent,
    DetailsComponent,
    ContactComponent,
    LogoComponent,
    BlogPreviewComponent,
  ],
  imports: [BrowserModule, FormsModule, HttpClientModule, AppRoutingModule],
  providers: [TaveApiService, UiService, ContentfulService],
  bootstrap: [AppComponent],
})
export class AppModule {}
