import {Component, Input, OnInit} from '@angular/core';
declare const ds;
declare const techan;

@Component({
  selector: 'app-candlestick',
  templateUrl: './candlestick.component.html',
  styleUrls: ['./candlestick.component.css']
})
export class CandlestickComponent implements OnInit {
  @Input() chartMargin = {top: 20, right: 20, bottom: 100, left: 50};
  @Input() contextMargin = {top: 420, right: 20, bottom: 20, left: 50};
  @Input() chartHeight: number;
  @Input() contextHeight: number;
  @Input() chartWidth: number;
  @Input() timeFormat: string;
  private width: number;
  private height: number;
  private height2: number;
  // axises
  private xAxis;
  private contextAxis;
  private yAxis;

  constructor() { }

  ngOnInit() {
    if (this.chartHeight === null) {
      this.chartMargin = {top: 20, right: 20, bottom: 100, left: 50};
    }

    if (this.contextMargin === null) {
      this.contextMargin = {top: 420, right: 20, bottom: 20, left: 50};
    }

  }

}
