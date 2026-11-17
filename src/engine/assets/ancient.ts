/*
 * The kit of the ancient world (Israel around 1000 BC): army camp, tents, the things of the baggage, the
 * dry hills and the stream of a valley, the stone houses and the gate of a town.
 *
 * Conventions:
 * - Things with a front (tent, royal tent, house, gate, chest) have it toward +z: whoever goes in or uses them
 *   walks toward -z. The cart and the donkey face -z, like the vehicles.
 * - Long things (wall, stream) run along x, centered on their origin.
 * - Everything stands on y = 0; rocks and roots sink a little, so they sit on ground that is not quite flat.
 */

// One file per part of the kit, in this order: the order the assets are registered (and listed) in.
import './ancient/camp';
import './ancient/royal-tent';
import './ancient/nature';
import './ancient/town';
import './ancient/sheep';
import './ancient/lamps';
import './ancient/cattle';
import './ancient/palace';
import './ancient/house';
