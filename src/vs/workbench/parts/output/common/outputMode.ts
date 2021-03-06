/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {IModeDescriptor} from 'vs/editor/common/modes';
import {IInstantiationService} from 'vs/platform/instantiation/common/instantiation';
import {OutputWorker} from 'vs/workbench/parts/output/common/outputWorker';
import {TPromise} from 'vs/base/common/winjs.base';
import URI from 'vs/base/common/uri';
import * as modes from 'vs/editor/common/modes';
import {CompatMode, ModeWorkerManager} from 'vs/editor/common/modes/abstractMode';
import {wireCancellationToken} from 'vs/base/common/async';
import {ICompatWorkerService, CompatWorkerAttr} from 'vs/editor/common/services/compatWorkerService';
import {IWorkspaceContextService} from 'vs/platform/workspace/common/workspace';

export class OutputMode extends CompatMode {

	private _modeWorkerManager: ModeWorkerManager<OutputWorker>;

	constructor(
		descriptor: IModeDescriptor,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICompatWorkerService compatWorkerService: ICompatWorkerService,
		@IWorkspaceContextService contextService:IWorkspaceContextService
	) {
		super(descriptor.id, compatWorkerService);
		this._modeWorkerManager = new ModeWorkerManager<OutputWorker>(descriptor, 'vs/workbench/parts/output/common/outputWorker', 'OutputWorker', null, instantiationService);


		let workspaceResource: URI = null;
		if (compatWorkerService.isInMainThread) {
			let workspace = contextService.getWorkspace();
			if (workspace) {
				workspaceResource = workspace.resource;
			}
		}

		if (workspaceResource) {
			modes.LinkProviderRegistry.register(this.getId(), {
				provideLinks: (model, token): Thenable<modes.ILink[]> => {
					return wireCancellationToken(token, this._provideLinks(workspaceResource, model.uri));
				}
			});
		}
	}

	private _worker<T>(runner: (worker: OutputWorker) => TPromise<T>): TPromise<T> {
		return this._modeWorkerManager.worker(runner);
	}

	static $_provideLinks = CompatWorkerAttr(OutputMode, OutputMode.prototype._provideLinks);
	private _provideLinks(workspaceResource: URI, resource: URI): TPromise<modes.ILink[]> {
		return this._worker((w) => w.provideLinks(workspaceResource, resource));
	}
}