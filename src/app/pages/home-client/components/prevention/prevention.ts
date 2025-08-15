import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-prevention',
  imports: [TranslateModule],
  templateUrl: './prevention.html',
  styleUrl: './prevention.css'
})
export class Prevention {
constructor(private route: ActivatedRoute, private scroller: ViewportScroller) {}

ngOnInit() {
  this.route.fragment.subscribe(fragment => {
    if (fragment) {
      setTimeout(() => {
        this.scroller.scrollToAnchor(fragment);
      }, 100);
    }
  });
}
}
