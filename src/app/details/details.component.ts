import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'ep-photography-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnInit {
  public items = [
    {
      copy: 'We are a team of photographers based in London, UK who specialise in documenting those moments that will live on in the memory for a lifetime.',
      imageUrl: 'https://bit.ly/2NRje8m'
    },
    {
      copy: 'We use every last drop of our creative juices to tell your story in the most unique way, while keeping as true as we can to the emotions and feelings at that time.',
      imageUrl: 'https://bit.ly/2NRje8m'
    },
    {
      copy: 'Our ultimate goal is to have our clients re-ignite those emotions and feelings everytime they look at our work.',
      imageUrl: 'https://bit.ly/2NRje8m'
    }
  ];

  constructor() { }

  ngOnInit() {
  }

}
