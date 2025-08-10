import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-hero-client',
  imports: [RouterLink, TranslateModule, CommonModule],
  templateUrl: './hero-client.html',
  styleUrl: './hero-client.css'
})
export class HeroClient {

}
