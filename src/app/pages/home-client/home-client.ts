import { Component } from '@angular/core';
import { FooterClient } from '../../shared/footer-client/footer-client';
import { HeaderClient } from '../../shared/header-client/header-client';
import { SummaryClient } from './components/summary-client/summary-client';
import { HeroClient } from './components/hero-client/hero-client';

@Component({
  selector: 'app-home-client',
  imports: [HomeClient,FooterClient,HeaderClient,SummaryClient,HeroClient],
  templateUrl: './home-client.html',
  styleUrl: './home-client.css'
})
export class HomeClient {

}
