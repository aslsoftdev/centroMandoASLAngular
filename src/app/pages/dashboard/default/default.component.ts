// Angular Import
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Project imports (solo lo que vayas a usar en tu dashboard real)
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-default',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './default.component.html',
  styleUrls: ['./default.component.scss']
})
export class DefaultComponent {
}
